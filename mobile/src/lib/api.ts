// Shared client for the web app's HTTP API (app/api/*). Attaches the Firebase
// ID token as a Bearer header — the same auth the web routes (aiGuard.js) expect.
import { fetch as expoFetch } from 'expo/fetch';
import { auth } from '@/lib/firebase';

export const apiBase = () => (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
export const apiConfigured = () => !!apiBase();

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function postJson<T = any>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('Backend not configured (set EXPO_PUBLIC_API_BASE_URL).');
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body), signal });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data as T;
}

export async function getJson<T = any>(path: string, signal?: AbortSignal): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('Backend not configured (set EXPO_PUBLIC_API_BASE_URL).');
  const res = await fetch(`${base}${path}`, { method: 'GET', headers: await authHeaders(), signal });
  if (!res.ok) throw new Error(`Request failed (${res.status}).`);
  return (await res.json()) as T;
}

// POST that streams an SSE response (data: {text|error}\n\n … data: [DONE]).
// Uses expo/fetch for real streaming. Invokes onText with each text delta.
export async function streamSse(path: string, body: any, onText: (delta: string) => void): Promise<void> {
  const base = apiBase();
  if (!base) throw new Error('Backend not configured (set EXPO_PUBLIC_API_BASE_URL).');
  const res = await expoFetch(`${base}${path}`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    let msg = `Request failed (${res.status}).`;
    try {
      const d = await res.json();
      if (d?.error) msg = d.error;
    } catch {}
    throw new Error(msg);
  }
  const reader = res.body?.getReader();
  const handle = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') return;
    try {
      const { text, error } = JSON.parse(payload);
      if (error) throw new Error(error);
      if (text) onText(text);
    } catch (e: any) {
      if (e?.message && e.message !== 'Unexpected end of JSON input') throw e;
    }
  };
  if (!reader) {
    (await res.text()).split('\n\n').forEach((l) => handle(l.trim()));
    return;
  }
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n\n');
    buf = lines.pop() || '';
    for (const l of lines) handle(l);
  }
  if (buf.trim()) handle(buf.trim());
}

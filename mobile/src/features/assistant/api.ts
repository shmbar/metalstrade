// AI Assistant client — calls the web app's POST /api/assistant (which holds the
// OpenAI key) and streams the SSE response. Uses expo/fetch for true streaming
// (React Native's global fetch doesn't expose a readable-stream reader).
import { fetch as expoFetch } from 'expo/fetch';
import { auth } from '@/lib/firebase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamArgs {
  messages: ChatMessage[];
  currentData?: any;
  currentPage?: string;
  dateRange?: { startDate?: string; endDate?: string };
  onText: (delta: string) => void;
  signal?: AbortSignal;
}

export const apiBaseUrl = () => (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
export const isAssistantConfigured = () => !!apiBaseUrl();

// Streams the assistant reply, invoking onText with each text delta. Mirrors the
// web client's SSE parsing (data: {text|error}\n\n, terminated by [DONE]).
export async function streamAssistant({ messages, currentData, currentPage, dateRange, onText, signal }: StreamArgs): Promise<void> {
  const base = apiBaseUrl();
  if (!base) throw new Error('Set EXPO_PUBLIC_API_BASE_URL to your deployed web app to use the Assistant.');

  const token = await auth.currentUser?.getIdToken().catch(() => null);

  const response = await expoFetch(`${base}/api/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, currentData: currentData || {}, currentPage: currentPage || '/apps/Assistant', dateRange }),
    signal,
  });

  if (!response.ok) {
    let msg = `Assistant request failed (${response.status}).`;
    try {
      const data = await response.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: no stream reader — read the whole body and parse all chunks.
    const text = await response.text();
    parseSse(text, onText);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    for (const line of lines) handleLine(line, onText);
  }
  if (buffer.trim()) handleLine(buffer.trim(), onText);
}

function handleLine(line: string, onText: (s: string) => void) {
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
}

function parseSse(body: string, onText: (s: string) => void) {
  body.split('\n\n').forEach((line) => handleLine(line.trim(), onText));
}

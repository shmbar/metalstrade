import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { postJson } from '@/lib/api';
import { newId } from '@/data/writes';

export interface ExtractResult {
  fields: any;
  appliedLabels: string[];
}

// Send a document (PDF base64 or camera photo) to the web app's document-reader
// (same OpenAI extraction the web "Autofill from proforma" uses) and shape the
// extracted contract fields for the edit form.
// Deterministic guard against the qty↔price swap (Iberinox-style scrambled PDFs):
// whatever the AI answered, a tonne-denominated line with a "price" ≤ $50 next to a
// "quantity" ≥ 1,000 is a swapped pair. Swap it back before it reaches the form.
function fixQtyPriceSwap(p: any) {
  const q = parseFloat(p.qnty);
  const pr = parseFloat(p.unitPrc);
  const unit = String(p.unit || '').toUpperCase();
  const tonneBased = !unit || unit.startsWith('T') || unit.startsWith('MT');
  if (tonneBased && Number.isFinite(q) && Number.isFinite(pr) && pr <= 50 && q >= 1000) {
    return { ...p, qnty: pr, unitPrc: q };
  }
  return p;
}

async function extract(fileBase64: string, mimeType: string, settings: any): Promise<ExtractResult> {
  const result = await postJson<any>('/api/ai/document-reader', {
    fileBase64,
    mimeType,
    documentType: 'contract',
    suppliers: settings?.Supplier?.Supplier || [],
    currencies: settings?.Currency?.Currency || [],
  });

  // Explicit mapping — port of web's handleApply. The server answers with
  // supplierId / currencyId / products / remarks; the form reads
  // supplier / cur / productsData / comments. Mobile used to read
  // `result.productsData` (which never exists) and then spread the RAW response
  // into the contract, so only `order` and `date` ever landed — and the AI's
  // freeform `remarks` STRING overwrote the structured remarks[] array, which was
  // then persisted to Firestore. Only mapped keys are returned now.
  const out: any = {};
  const applied: string[] = [];

  if (result?.order) { out.order = result.order; applied.push('PO No'); }
  if (result?.supplierId) { out.supplier = result.supplierId; applied.push('Supplier'); }
  if (result?.currencyId) { out.cur = result.currencyId; applied.push('Currency'); }
  if (result?.date) {
    out.date = result.date;
    out.dateRange = { startDate: result.date, endDate: result.date };
    applied.push('Date');
  }
  if (Array.isArray(result?.products) && result.products.length) {
    out.productsData = result.products.map(fixQtyPriceSwap).map((p: any) => ({
      id: newId(),
      description: p.description || '',
      qnty: p.qnty || '',
      unitPrc: p.unitPrc || '',
      // unit + line total let the Materials Breakdown convert to MT and reproduce
      // the exact invoice amount (harmless extras elsewhere).
      unit: p.unit || '',
      lineTotal: p.lineTotal ?? '',
    }));
    applied.push('Products');
  }

  // `remarks` is a structured ARRAY in this app — never overwrite it with a
  // freeform string. The AI's notes go to the plain-string `comments` field, along
  // with chemistry and scale pricing, which have no structured field yet.
  const extra: string[] = [];
  if (result?.remarks) extra.push(String(result.remarks));
  (result?.products || []).forEach((p: any) => {
    if (p.analysis) extra.push(`${p.description || 'Material'} — analysis: ${p.analysis}`);
  });
  if (result?.scalePricing) extra.push(`Scale prices: ${result.scalePricing}`);
  if (extra.length) { out.comments = extra.join('\n'); applied.push('Comments'); }

  // Surface the server's own quality signals rather than applying blindly.
  out.__lineCheckFailed = !!result?.lineCheckFailed;
  out.__confidence = result?.confidence ?? null;

  return { fields: out, appliedLabels: [...new Set(applied)] };
}

// Pick a supplier proforma/contract PDF from the file system.
export async function pickAndExtractContract(settings: any): Promise<ExtractResult | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return extract(fileBase64, asset.mimeType || 'application/pdf', settings);
}

// A PDF opened INTO the app ("Open in IMS" from Mail/WhatsApp/Files) — the OS
// hands us a file:// (iOS inbox copy) or content:// (Android) URI.
export async function extractFromUri(uri: string, settings: any): Promise<ExtractResult> {
  const fileBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return extract(fileBase64, 'application/pdf', settings);
}

// Photograph a paper proforma with the camera — GPT-4o vision reads it server-side.
export async function scanAndExtractContract(settings: any): Promise<ExtractResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7, // keeps the payload well under serverless body limits
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length || !res.assets[0].base64) return null;
  return extract(res.assets[0].base64, 'image/jpeg', settings);
}

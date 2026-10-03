import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { postJson } from '@/lib/api';
import { fileNameOf, mimeFor } from '@/lib/mime';
import { newId } from '@/data/writes';

export interface ExtractResult {
  fields: any;
  appliedLabels: string[];
}

/** A document picked from Files or photographed — kept whole so it can be read AND attached. */
export interface PickedDocument {
  uri: string;
  name: string;
  mimeType: string;
  base64: string;
}

// The web routes run as serverless functions whose request body is capped at about
// 4.5 MB, and base64 makes a file a third bigger. A larger upload came back as the
// platform's bare 413 page. Refused here instead, in words the user can act on.
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
const MAX_BASE64 = Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4;
const TOO_BIG = 'That file is over 3 MB, too big to read. Send a smaller copy, or photograph the page with Scan with camera.';
const PHOTO_TOO_BIG = 'That photo is too big to read. Take it again a little further from the page.';
const NO_CAMERA = 'Camera access is off for IMS. Turn it on in Settings → IMS → Camera to scan a document.';

// Pick a document from the file system (PDF by default).
export async function pickDocument(types: string[] = ['application/pdf']): Promise<PickedDocument | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (asset.size != null && asset.size > MAX_DOCUMENT_BYTES) throw new Error(TOO_BIG);
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  // Some providers report no size; the encoded length is the real test.
  if (base64.length > MAX_BASE64) throw new Error(TOO_BIG);
  return { uri: asset.uri, name: asset.name || 'document.pdf', mimeType: asset.mimeType || 'application/pdf', base64 };
}

// Photograph a paper document with the camera — GPT-4o vision reads it server-side.
export async function photographDocument(): Promise<PickedDocument | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  // A refused camera used to do nothing at all, which read as a broken button.
  if (!perm.granted) throw new Error(NO_CAMERA);
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7, // keeps the payload well under serverless body limits
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length || !res.assets[0].base64) return null;
  const asset = res.assets[0];
  if ((asset.base64 as string).length > MAX_BASE64) throw new Error(PHOTO_TOO_BIG);
  return { uri: asset.uri, name: asset.fileName || `Scan ${scanStamp()}.jpg`, mimeType: 'image/jpeg', base64: asset.base64 as string };
}

// A file handed to the app ("Open in IMS" from Mail/WhatsApp/Files) — the OS gives a
// file:// (iOS inbox copy) or content:// (Android) URI.
export async function documentFromUri(uri: string): Promise<PickedDocument> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  if (base64.length > MAX_BASE64) throw new Error(TOO_BIG);
  const name = fileNameOf(uri);
  return { uri, name, mimeType: mimeFor(name) || 'application/pdf', base64 };
}

// "2026-10-03 16.05" — a readable name for a camera scan, which has none of its own.
function scanStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}`;
}

// Send a document to the web app's document-reader — the same OpenAI extraction the
// web's "Autofill from PDF" buttons use.
function readDocument(doc: PickedDocument, body: Record<string, any>): Promise<any> {
  return postJson<any>('/api/ai/document-reader', {
    fileBase64: doc.base64,
    mimeType: doc.mimeType,
    fileName: doc.name,
    ...body,
  });
}

/**
 * Read a supplier's invoice — web's "Autofill from PDF" on the Purchase invoices
 * window: DocumentImportOverlay with documentType 'expense' (vendor invoice number +
 * amount). Returns the reader's raw answer; invoiceRead.ts decides what lands.
 */
export function readSupplierInvoice(doc: PickedDocument, settings: any): Promise<any> {
  return readDocument(doc, {
    documentType: 'expense',
    suppliers: settings?.Supplier?.Supplier || [],
    clients: [],
    currencies: settings?.Currency?.Currency || [],
    expenseTypes: settings?.Expenses?.Expenses || [],
  });
}

// Shape the extracted contract fields for the edit form.
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

async function extract(doc: PickedDocument, settings: any): Promise<ExtractResult> {
  const result = await readDocument(doc, {
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
  const doc = await pickDocument(['application/pdf']);
  return doc ? extract(doc, settings) : null;
}

// A PDF opened INTO the app, read as a supplier proforma for a new contract.
export async function extractFromUri(uri: string, settings: any): Promise<ExtractResult> {
  return extract(await documentFromUri(uri), settings);
}

// Photograph a paper proforma with the camera — GPT-4o vision reads it server-side.
export async function scanAndExtractContract(settings: any): Promise<ExtractResult | null> {
  const doc = await photographDocument();
  return doc ? extract(doc, settings) : null;
}

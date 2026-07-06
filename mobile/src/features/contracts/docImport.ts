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
async function extract(fileBase64: string, mimeType: string, settings: any): Promise<ExtractResult> {
  const fields = await postJson<any>('/api/ai/document-reader', {
    fileBase64,
    mimeType,
    documentType: 'contract',
    suppliers: settings?.Supplier?.Supplier || [],
    currencies: settings?.Currency?.Currency || [],
  });

  // Ensure imported product lines carry ids (the edit form keys on them).
  if (Array.isArray(fields?.productsData)) {
    fields.productsData = fields.productsData.map((p: any) => ({ id: p.id || newId(), ...p }));
  }

  const appliedLabels = Object.keys(fields || {})
    .map((k) => ({ order: 'PO No', supplier: 'Supplier', cur: 'Currency', productsData: 'Products', comments: 'Comments', date: 'Date' } as any)[k])
    .filter(Boolean);

  return { fields, appliedLabels: [...new Set(appliedLabels)] as string[] };
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

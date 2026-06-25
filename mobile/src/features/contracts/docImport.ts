import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { postJson } from '@/lib/api';
import { newId } from '@/data/writes';

// Pick a supplier proforma/contract PDF, send it to the web app's document-reader
// (same OpenAI extraction the web "Autofill from proforma" uses), and return the
// extracted contract fields ready to merge into the edit form.
export async function pickAndExtractContract(settings: any): Promise<{ fields: any; appliedLabels: string[] } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

  const fields = await postJson<any>('/api/ai/document-reader', {
    fileBase64,
    mimeType: asset.mimeType || 'application/pdf',
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

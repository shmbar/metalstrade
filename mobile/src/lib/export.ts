import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// Render an HTML string to a PDF and open the share sheet. Used for documents
// (contract PO, invoice) — parity with the web jsPDF exports.
export async function exportPdf(html: string, _filename = 'document'): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF', UTI: 'com.adobe.pdf' });
  }
}

const esc = (v: any) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Write rows to a CSV file (opens in Excel/Numbers/Sheets) and share it. Used for
// table exports — parity with the web exceljs exports.
export async function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): Promise<void> {
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const safe = filename.replace(/[^a-z0-9._-]+/gi, '_');
  const uri = `${FileSystem.cacheDirectory}${safe}.csv`;
  await FileSystem.writeAsStringAsync(uri, '﻿' + csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV', UTI: 'public.comma-separated-values-text' });
  }
}

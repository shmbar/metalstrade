// The media type a stored file should be served with. Pure.
//
// React Native's blob of a local file carries no type, and Firebase Storage then
// serves the upload as application/octet-stream — so a purchase invoice's PDF
// attached from the phone opened on the web as a download instead of a document.
// The picker's own type wins; otherwise the name's extension decides.

const BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  gif: 'image/gif',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
};

export function mimeFor(name: string, given?: string | null): string | undefined {
  if (given && given !== 'application/octet-stream') return given;
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? BY_EXTENSION[m[1]] : undefined;
}

/**
 * The file name at the end of a file:// or content:// URI — what the OS hands the app
 * for "Open in IMS" — decoded when it can be ("Invoice%20147.pdf" → "Invoice 147.pdf").
 */
export function fileNameOf(uri: string, fallback = 'document.pdf'): string {
  const last = String(uri || '').split(/[?#]/)[0].split('/').pop() || '';
  if (!last) return fallback;
  try {
    return decodeURIComponent(last);
  } catch {
    return last; // a stray "%" in the name — keep it as it came
  }
}

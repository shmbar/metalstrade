// Firebase Storage file attachments — port of utils.js uploadFile/getAllfiles/
// deleteFile. Files live under `${entityId}/${name}` (same paths as the web app,
// so attachments are shared between web and mobile).
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { mimeFor } from '@/lib/mime';

export interface StoredFile {
  name: string;
  url: string;
}

export async function listFiles(entityId: string): Promise<StoredFile[]> {
  const res = await listAll(ref(storage, `${entityId}/`));
  return Promise.all(res.items.map(async (item) => ({ name: item.name, url: await getDownloadURL(item) })));
}

// Uploads a picked file (by local uri) to Storage and returns its download URL.
// Stored with its media type (lib/mime): without one a PDF is served as
// application/octet-stream, and the web downloads it instead of showing it.
export async function uploadFile(entityId: string, uri: string, name: string, contentType?: string | null): Promise<StoredFile> {
  const blob = await (await fetch(uri)).blob();
  const r = ref(storage, `${entityId}/${name}`);
  const type = mimeFor(name, contentType || blob.type);
  await uploadBytes(r, blob, type ? { contentType: type } : undefined);
  return { name, url: await getDownloadURL(r) };
}

export async function deleteFile(entityId: string, name: string): Promise<void> {
  await deleteObject(ref(storage, `${entityId}/${name}`));
}

/* Whether a folder holds anything — for the paperclip on expense rows (web
   components/ExpenseInvoiceCell.js, 0b32af41). One listing per row, at most six at a time,
   so a long list never fires dozens of listings at once. */
let running = 0;
const waiting: (() => void)[] = [];
const limited = <T,>(task: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const run = () => {
      running++;
      task().then(resolve, reject).finally(() => {
        running--;
        waiting.shift()?.();
      });
    };
    if (running < 6) run();
    else waiting.push(run);
  });

export async function hasFiles(entityId: string): Promise<boolean> {
  if (!entityId) return false;
  const res = await limited(() => listAll(ref(storage, `${entityId}/`)));
  return res.items.length > 0;
}

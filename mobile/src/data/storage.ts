// Firebase Storage file attachments — port of utils.js uploadFile/getAllfiles/
// deleteFile. Files live under `${entityId}/${name}` (same paths as the web app,
// so attachments are shared between web and mobile).
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface StoredFile {
  name: string;
  url: string;
}

export async function listFiles(entityId: string): Promise<StoredFile[]> {
  const res = await listAll(ref(storage, `${entityId}/`));
  return Promise.all(res.items.map(async (item) => ({ name: item.name, url: await getDownloadURL(item) })));
}

// Uploads a picked file (by local uri) to Storage and returns its download URL.
export async function uploadFile(entityId: string, uri: string, name: string): Promise<StoredFile> {
  const blob = await (await fetch(uri)).blob();
  const r = ref(storage, `${entityId}/${name}`);
  await uploadBytes(r, blob);
  return { name, url: await getDownloadURL(r) };
}

export async function deleteFile(entityId: string, name: string): Promise<void> {
  await deleteObject(ref(storage, `${entityId}/${name}`));
}

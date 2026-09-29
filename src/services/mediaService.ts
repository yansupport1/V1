import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { generateId } from '../lib/utils';

export type UploadProgress = (pct: number) => void;

export async function uploadFile(
  file: File,
  pathPrefix: string,
  onProgress?: UploadProgress
): Promise<{ url: string; path: string; mime: string; size: number; name: string }> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const path = `${pathPrefix}/${Date.now()}_${generateId()}_${safeName}`;
  const sRef = storageRef(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(sRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          url,
          path,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          name: file.name,
        });
      }
    );
  });
}

/** Compress image client-side before upload (max edge 1280px, jpeg 0.8) */
export async function compressImage(file: File, maxEdge = 1280, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob(res, 'image/jpeg', quality)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

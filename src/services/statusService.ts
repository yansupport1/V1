import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
} from 'firebase/database';
import { db } from '../lib/firebase';
import type { StatusItem } from '../types';
import { generateId } from '../lib/utils';

const TTL_MS = 24 * 60 * 60 * 1000;

export async function createStatus(input: {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  type: 'text' | 'image' | 'video';
  text?: string; // caption or text status
  mediaUrl?: string;
  backgroundColor?: string;
}): Promise<string> {
  const id = generateId();
  const now = Date.now();
  const item: StatusItem = {
    id,
    uid: input.uid,
    username: input.username,
    displayName: input.displayName,
    photoURL: input.photoURL || '',
    type: input.type,
    text: input.text || '',
    mediaUrl: input.mediaUrl || '',
    backgroundColor: input.backgroundColor || '#128C7E',
    createdAt: now,
    expiresAt: now + TTL_MS,
    viewers: {},
    privacy: 'contacts',
  };
  // strip empty optional
  const clean = JSON.parse(JSON.stringify(item));
  await set(ref(db, `statuses/${input.uid}/${id}`), clean);
  await set(ref(db, `statusIndex/${id}`), {
    uid: input.uid,
    expiresAt: item.expiresAt,
    createdAt: now,
  });
  return id;
}

export async function deleteStatus(uid: string, statusId: string) {
  await remove(ref(db, `statuses/${uid}/${statusId}`));
  await remove(ref(db, `statusIndex/${statusId}`));
}

export async function markStatusViewed(ownerUid: string, statusId: string, viewerUid: string) {
  if (ownerUid === viewerUid) return;
  await update(ref(db, `statuses/${ownerUid}/${statusId}/viewers`), {
    [viewerUid]: Date.now(),
  });
}

export function subscribeMyStatuses(uid: string, cb: (list: StatusItem[]) => void) {
  const r = ref(db, `statuses/${uid}`);
  return onValue(r, (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const now = Date.now();
    const list: StatusItem[] = [];
    snap.forEach((c) => {
      const v = c.val() as StatusItem;
      if (v.expiresAt > now) list.push({ ...v, id: c.key! });
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

/** Ambil status kontak (simplified: fetch by contact uids) */
export async function fetchContactsStatuses(
  contactUids: string[]
): Promise<Record<string, StatusItem[]>> {
  const now = Date.now();
  const result: Record<string, StatusItem[]> = {};
  await Promise.all(
    contactUids.map(async (uid) => {
      const snap = await get(ref(db, `statuses/${uid}`));
      if (!snap.exists()) return;
      const list: StatusItem[] = [];
      snap.forEach((c) => {
        const v = c.val() as StatusItem;
        if (v.expiresAt > now) list.push({ ...v, id: c.key! });
      });
      if (list.length) {
        list.sort((a, b) => a.createdAt - b.createdAt);
        result[uid] = list;
      }
    })
  );
  return result;
}

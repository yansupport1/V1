import { ref, set, get, update, push, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import type { Conversation } from '../types';
import { generateId } from '../lib/utils';

export async function createChannel(input: {
  name: string;
  username?: string;
  description?: string;
  isPublic: boolean;
  creatorUid: string;
}): Promise<string> {
  const convId = `c_${generateId()}`;
  const now = Date.now();
  const uname = input.username?.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);

  if (uname) {
    const exists = await get(ref(db, `channelUsernames/${uname}`));
    if (exists.exists()) throw new Error('Username channel sudah dipakai');
  }

  const conv: Conversation = {
    id: convId,
    type: 'channel',
    name: input.name.trim(),
    description: input.description?.trim() || '',
    photoURL: '',
    members: {
      [input.creatorUid]: { uid: input.creatorUid, role: 'owner', joinedAt: now },
    },
    createdAt: now,
    updatedAt: now,
    createdBy: input.creatorUid,
    settings: {
      isPublic: input.isPublic,
      username: uname || undefined,
      subscriberCount: 1,
    } as any,
  };

  const clean = JSON.parse(JSON.stringify(conv));
  await set(ref(db, `conversations/${convId}`), clean);
  if (uname) {
    await set(ref(db, `channelUsernames/${uname}`), { convId, createdAt: now });
  }
  await set(ref(db, `userConversations/${input.creatorUid}/${convId}`), {
    type: 'channel',
    updatedAt: now,
    name: conv.name,
  });
  return convId;
}

export async function followChannel(convId: string, uid: string) {
  const now = Date.now();
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) throw new Error('Channel tidak ditemukan');
  const conv = convSnap.val();
  if (conv.members?.[uid]) return;

  await update(ref(db, `conversations/${convId}/members/${uid}`), {
    uid,
    role: 'subscriber',
    joinedAt: now,
  });
  const count = (conv.settings?.subscriberCount || 0) + 1;
  await update(ref(db, `conversations/${convId}/settings`), { subscriberCount: count });
  await set(ref(db, `userConversations/${uid}/${convId}`), {
    type: 'channel',
    updatedAt: now,
    name: conv.name,
  });
}

export async function unfollowChannel(convId: string, uid: string) {
  await set(ref(db, `conversations/${convId}/members/${uid}`), null);
  await set(ref(db, `userConversations/${uid}/${convId}`), null);
}

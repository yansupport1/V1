import { ref, set, get, update, push, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import type { Conversation } from '../types';
import { generateId } from '../lib/utils';

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function createGroup(input: {
  name: string;
  description?: string;
  photoURL?: string;
  creatorUid: string;
  memberUids?: string[];
}): Promise<{ convId: string; inviteLink: string }> {
  const convId = `g_${generateId()}`;
  const now = Date.now();
  const code = inviteCode();
  const members: Conversation['members'] = {
    [input.creatorUid]: { uid: input.creatorUid, role: 'owner', joinedAt: now },
  };
  (input.memberUids || []).forEach((uid) => {
    if (uid !== input.creatorUid) {
      members[uid] = { uid, role: 'member', joinedAt: now };
    }
  });

  const conv: Conversation = {
    id: convId,
    type: 'group',
    name: input.name.trim(),
    description: input.description?.trim() || '',
    photoURL: input.photoURL || '',
    members,
    createdAt: now,
    updatedAt: now,
    createdBy: input.creatorUid,
    settings: {
      onlyAdminsCanMessage: false,
      onlyAdminsCanEditInfo: true,
    },
  };

  const clean = JSON.parse(JSON.stringify(conv));
  await set(ref(db, `conversations/${convId}`), clean);
  await set(ref(db, `groupInvites/${code}`), {
    convId,
    createdBy: input.creatorUid,
    createdAt: now,
  });
  await set(ref(db, `conversations/${convId}/inviteCode`), code);

  // index for all members
  const updates: Record<string, unknown> = {};
  Object.keys(members).forEach((uid) => {
    updates[`userConversations/${uid}/${convId}`] = {
      type: 'group',
      updatedAt: now,
      name: conv.name,
    };
  });
  await update(ref(db), updates);

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`;
  return { convId, inviteLink };
}

export async function joinByInviteCode(code: string, uid: string): Promise<string> {
  const snap = await get(ref(db, `groupInvites/${code}`));
  if (!snap.exists()) throw new Error('Link undangan tidak valid atau sudah direset');
  const { convId } = snap.val();
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) throw new Error('Grup tidak ditemukan');
  const conv = convSnap.val() as Conversation;
  if (conv.members?.[uid]) return convId; // already member

  const now = Date.now();
  await update(ref(db, `conversations/${convId}/members/${uid}`), {
    uid,
    role: 'member',
    joinedAt: now,
  });
  await set(ref(db, `userConversations/${uid}/${convId}`), {
    type: 'group',
    updatedAt: now,
    name: conv.name,
  });
  return convId;
}

export async function resetInviteLink(convId: string, byUid: string): Promise<string> {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) throw new Error('Grup tidak ditemukan');
  const conv = convSnap.val() as Conversation;
  const me = conv.members?.[byUid];
  if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
    throw new Error('Hanya admin yang bisa reset link');
  }
  const old = convSnap.val().inviteCode;
  if (old) await set(ref(db, `groupInvites/${old}`), null);
  const code = inviteCode();
  await set(ref(db, `groupInvites/${code}`), {
    convId,
    createdBy: byUid,
    createdAt: Date.now(),
  });
  await update(ref(db, `conversations/${convId}`), { inviteCode: code });
  return code;
}

export function getInviteUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

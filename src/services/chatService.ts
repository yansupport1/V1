import {
  ref,
  push,
  set,
  update,
  get,
  onValue,
  onChildAdded,
  query,
  orderByChild,
  limitToLast,
  endBefore,
  serverTimestamp,
  off,
} from 'firebase/database';
import { db } from '../lib/firebase';
import type { Conversation, Message, MessageType, TypingIndicator } from '../types';
import { generateId, getConversationId, sanitizeText } from '../lib/utils';

export async function getOrCreatePrivateConversation(
  myUid: string,
  otherUid: string,
  otherName: string,
  myName: string
): Promise<string> {
  const convId = getConversationId(myUid, otherUid);
  const convRef = ref(db, `conversations/${convId}`);
  const snap = await get(convRef);

  if (!snap.exists()) {
    const now = Date.now();
    const conv: Conversation = {
      id: convId,
      type: 'private',
      members: {
        [myUid]: { uid: myUid, role: 'member', joinedAt: now },
        [otherUid]: { uid: otherUid, role: 'member', joinedAt: now },
      },
      createdAt: now,
      updatedAt: now,
      createdBy: myUid,
    };
    await set(convRef, conv);
    // index for each user
    await set(ref(db, `userConversations/${myUid}/${convId}`), {
      type: 'private',
      otherUid,
      updatedAt: now,
    });
    await set(ref(db, `userConversations/${otherUid}/${convId}`), {
      type: 'private',
      otherUid: myUid,
      updatedAt: now,
    });
  }
  return convId;
}

export function subscribeUserConversations(
  uid: string,
  cb: (items: { id: string; updatedAt: number; type: string; otherUid?: string }[]) => void
) {
  const r = ref(db, `userConversations/${uid}`);
  return onValue(r, (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const val = snap.val();
    const list = Object.entries(val).map(([id, v]: [string, any]) => ({
      id,
      updatedAt: v.updatedAt || 0,
      type: v.type,
      otherUid: v.otherUid,
    }));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    cb(list);
  });
}

export async function fetchConversation(convId: string): Promise<Conversation | null> {
  const snap = await get(ref(db, `conversations/${convId}`));
  return snap.exists() ? ({ id: convId, ...snap.val() } as Conversation) : null;
}

export function subscribeConversation(convId: string, cb: (c: Conversation | null) => void) {
  return onValue(ref(db, `conversations/${convId}`), (snap) => {
    cb(snap.exists() ? ({ id: convId, ...snap.val() } as Conversation) : null);
  });
}

const PAGE_SIZE = 40;

export function subscribeRecentMessages(
  convId: string,
  cb: (messages: Message[]) => void
) {
  const q = query(
    ref(db, `messages/${convId}`),
    orderByChild('createdAt'),
    limitToLast(PAGE_SIZE)
  );
  return onValue(q, (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const list: Message[] = [];
    snap.forEach((child) => {
      list.push({ id: child.key!, ...child.val() });
    });
    cb(list);
  });
}

export async function loadOlderMessages(
  convId: string,
  beforeTs: number
): Promise<Message[]> {
  const q = query(
    ref(db, `messages/${convId}`),
    orderByChild('createdAt'),
    endBefore(beforeTs),
    limitToLast(PAGE_SIZE)
  );
  const snap = await get(q);
  if (!snap.exists()) return [];
  const list: Message[] = [];
  snap.forEach((child) => {
    list.push({ id: child.key!, ...child.val() });
  });
  return list;
}

export async function sendTextMessage(
  convId: string,
  senderId: string,
  senderName: string,
  text: string,
  replyTo?: Message['replyTo'],
  clientId?: string
): Promise<string> {
  const clean = sanitizeText(text);
  if (!clean) throw new Error('Pesan kosong');

  const msgRef = push(ref(db, `messages/${convId}`));
  const id = msgRef.key!;
  const now = Date.now();

  const message: Omit<Message, 'id'> = {
    conversationId: convId,
    senderId,
    senderName,
    type: 'text',
    text: clean,
    status: 'sent',
    createdAt: now,
    clientId,
    ...(replyTo ? { replyTo } : {}),
  };

  await set(msgRef, message);

  // update conversation lastMessage
  await update(ref(db, `conversations/${convId}`), {
    lastMessage: {
      id,
      text: clean,
      type: 'text',
      senderId,
      senderName,
      timestamp: now,
      status: 'sent',
    },
    updatedAt: now,
  });

  // bump userConversations for all members
  const convSnap = await get(ref(db, `conversations/${convId}/members`));
  if (convSnap.exists()) {
    const members = Object.keys(convSnap.val());
    const updates: Record<string, any> = {};
    members.forEach((uid) => {
      updates[`userConversations/${uid}/${convId}/updatedAt`] = now;
    });
    await update(ref(db), updates);
  }

  return id;
}

export async function sendMediaMessage(
  convId: string,
  senderId: string,
  senderName: string,
  type: MessageType,
  mediaUrl: string,
  opts: {
    text?: string;
    mediaThumbnail?: string;
    mediaMime?: string;
    mediaSize?: number;
    mediaDuration?: number;
    fileName?: string;
    clientId?: string;
  } = {}
): Promise<string> {
  const msgRef = push(ref(db, `messages/${convId}`));
  const id = msgRef.key!;
  const now = Date.now();

  const message: Omit<Message, 'id'> = {
    conversationId: convId,
    senderId,
    senderName,
    type,
    mediaUrl,
    status: 'sent',
    createdAt: now,
    ...opts,
  };

  await set(msgRef, message);
  await update(ref(db, `conversations/${convId}`), {
    lastMessage: {
      id,
      text: opts.text || (type === 'voice' ? '🎤 Voice note' : type === 'image' ? '📷 Foto' : '📎 Media'),
      type,
      senderId,
      senderName,
      timestamp: now,
      status: 'sent',
    },
    updatedAt: now,
  });

  return id;
}

export async function markMessagesRead(convId: string, uid: string, messageIds: string[]) {
  const updates: Record<string, any> = {};
  messageIds.forEach((mid) => {
    updates[`messages/${convId}/${mid}/status`] = 'read';
    updates[`messages/${convId}/${mid}/readBy/${uid}`] = Date.now();
  });
  if (Object.keys(updates).length) await update(ref(db), updates);
}

export function setTyping(convId: string, uid: string, displayName: string, isTyping: boolean) {
  const r = ref(db, `typing/${convId}/${uid}`);
  if (isTyping) {
    set(r, { uid, displayName, timestamp: Date.now() });
  } else {
    set(r, null);
  }
}

export function subscribeTyping(convId: string, myUid: string, cb: (list: TypingIndicator[]) => void) {
  return onValue(ref(db, `typing/${convId}`), (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const now = Date.now();
    const list: TypingIndicator[] = [];
    snap.forEach((child) => {
      const v = child.val();
      if (v.uid !== myUid && now - v.timestamp < 5000) {
        list.push(v);
      }
    });
    cb(list);
  });
}

export async function deleteMessageForMe(convId: string, messageId: string, uid: string) {
  await update(ref(db, `messages/${convId}/${messageId}/deletedFor`), { [uid]: true });
}

export async function deleteMessageForEveryone(convId: string, messageId: string, senderId: string) {
  await update(ref(db, `messages/${convId}/${messageId}`), {
    deletedForEveryone: true,
    text: '',
    mediaUrl: '',
  });
}

export async function editMessage(convId: string, messageId: string, newText: string) {
  await update(ref(db, `messages/${convId}/${messageId}`), {
    text: sanitizeText(newText),
    editedAt: Date.now(),
  });
}

export async function toggleReaction(
  convId: string,
  messageId: string,
  emoji: string,
  uid: string
) {
  const path = `messages/${convId}/${messageId}/reactions/${emoji}`;
  const snap = await get(ref(db, path));
  const current: string[] = snap.exists() ? snap.val() : [];
  const next = current.includes(uid)
    ? current.filter((id) => id !== uid)
    : [...current, uid];
  await set(ref(db, path), next.length ? next : null);
}

export async function addContact(myUid: string, contactUid: string, contact: {
  username: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
}) {
  await set(ref(db, `contacts/${myUid}/${contactUid}`), {
    uid: contactUid,
    ...contact,
    addedAt: Date.now(),
  });
}

export function subscribeContacts(uid: string, cb: (contacts: any[]) => void) {
  return onValue(ref(db, `contacts/${uid}`), (snap) => {
    if (!snap.exists()) {
      cb([]);
      return;
    }
    const list = Object.values(snap.val());
    cb(list as any[]);
  });
}

export async function blockUser(myUid: string, targetUid: string) {
  await set(ref(db, `blocks/${myUid}/${targetUid}`), { blockedAt: Date.now() });
  await update(ref(db, `contacts/${myUid}/${targetUid}`), { blocked: true });
}

export async function unblockUser(myUid: string, targetUid: string) {
  await set(ref(db, `blocks/${myUid}/${targetUid}`), null);
  await update(ref(db, `contacts/${myUid}/${targetUid}`), { blocked: false });
}

import { ref, set, get, update } from 'firebase/database';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types';
import { getOrCreatePrivateConversation, sendTextMessage, addContact } from './chatService';

export const AI_UID = 'yessapp_support_ai';
export const AI_USERNAME = 'yessapp_support';
export const AI_DISPLAY = 'Yess App Support';

const AI_PROFILE: UserProfile = {
  uid: AI_UID,
  username: AI_USERNAME,
  displayName: AI_DISPLAY,
  photoURL: '',
  bio: 'Asisten resmi YessApp · siap bantu 24 jam',
  isOnline: true,
  lastSeen: Date.now(),
  createdAt: 0,
  updatedAt: Date.now(),
  privacy: {
    lastSeen: 'everyone',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    readReceipts: true,
  },
};

/** Pastikan akun AI ada di database */
export async function ensureAiUser(): Promise<void> {
  const snap = await get(ref(db, `users/${AI_UID}`));
  if (!snap.exists()) {
    await set(ref(db, `users/${AI_UID}`), { ...AI_PROFILE, updatedAt: Date.now() });
    await set(ref(db, `usernames/${AI_USERNAME}`), { uid: AI_UID, createdAt: Date.now() });
  } else {
    // keep online
    await update(ref(db, `users/${AI_UID}`), { isOnline: true, lastSeen: Date.now() });
  }
}

/** Dipanggil setelah user baru daftar — buat chat + sapaan */
export async function welcomeNewUser(user: UserProfile): Promise<void> {
  await ensureAiUser();
  const convId = await getOrCreatePrivateConversation(
    user.uid,
    AI_UID,
    AI_DISPLAY,
    user.displayName
  );
  await addContact(user.uid, AI_UID, {
    username: AI_USERNAME,
    displayName: AI_DISPLAY,
    photoURL: '',
  });

  const greeting =
    `Halo ${user.displayName}! 👋\n\n` +
    `Selamat datang di *YessApp*. Aku *Yess App Support*, asisten resmi yang siap bantu kamu.\n\n` +
    `Yang bisa aku bantu:\n` +
    `• Cara mulai chat & cari username\n` +
    `• Status 24 jam\n` +
    `• Grup & channel\n` +
    `• Privasi & keamanan\n\n` +
    `Ketik *bantuan* kapan saja, atau langsung tanya ya!`;

  await sendTextMessage(convId, AI_UID, AI_DISPLAY, greeting);
}

/** Balasan AI lokal tanpa API — rule sederhana */
export function generateAiReply(userText: string, displayName: string): string {
  const t = userText.toLowerCase().trim();

  if (/^(hai|halo|hello|hi|hey)\b/.test(t)) {
    return `Halo ${displayName}! Ada yang bisa aku bantu? Ketik *bantuan* untuk menu.`;
  }
  if (/bantuan|help|fitur|cara/.test(t)) {
    return (
      `📖 *Panduan YessApp*\n\n` +
      `1. *Chat* — ketuk + di beranda, cari username teman\n` +
      `2. *Status* — tab Status → Status saya (teks/foto + caption)\n` +
      `3. *Grup* — tab Komunitas → Buat grup → bagikan link undangan\n` +
      `4. *Channel* — tab Komunitas → Buat channel (broadcast)\n` +
      `5. *Privasi* — Profil → Privasi\n\n` +
      `Ada pertanyaan spesifik? Tulis saja.`
    );
  }
  if (/status/.test(t)) {
    return `Status 24 jam: buka tab *Status* → ketuk *Status saya* → pilih teks atau foto, tulis caption, lalu bagikan. Status otomatis hilang setelah 24 jam.`;
  }
  if (/grup|group|undangan|invite/.test(t)) {
    return `Buat grup di tab *Komunitas* → *Buat grup*. Setelah dibuat, buka info grup → *Link undangan* lalu bagikan. Teman yang buka link bisa join.`;
  }
  if (/channel|saluran/.test(t)) {
    return `Channel cocok untuk broadcast. Di *Komunitas* → *Buat channel*, atur public/private, lalu post update ke subscriber.`;
  }
  if (/privasi|block|blokir/.test(t)) {
    return `Pengaturan privasi ada di *Profil → Privasi*. Kamu bisa atur siapa yang lihat foto, bio, last seen, dan status.`;
  }
  if (/terima kasih|makasih|thanks/.test(t)) {
    return `Sama-sama, ${displayName}! Kalau butuh lagi, chat aku kapan saja 😊`;
  }
  if (/bug|error|rusak|gagal/.test(t)) {
    return `Maaf ada gangguan. Coba refresh halaman atau login ulang. Kalau masih bermasalah, jelaskan langkahnya biar aku bantu.`;
  }

  return (
    `Aku terima pesanmu. Coba ketik salah satu:\n` +
    `• *bantuan*\n• *status*\n• *grup*\n• *channel*\n• *privasi*\n\n` +
    `Atau tanya dengan kalimat singkat ya.`
  );
}

/** Proses pesan masuk ke AI — dipanggil dari chat room jika lawan = AI */
export async function handleAiIncoming(
  convId: string,
  fromUser: UserProfile,
  text: string
): Promise<void> {
  // delay biar terasa natural
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));
  const reply = generateAiReply(text, fromUser.displayName);
  await sendTextMessage(convId, AI_UID, AI_DISPLAY, reply);
}

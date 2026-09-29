import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Kemarin';
  return format(d, 'dd/MM/yy');
}

export function formatLastSeen(ts: number): string {
  if (!ts) return 'terakhir dilihat baru-baru ini';
  return `terakhir dilihat ${formatDistanceToNow(ts, { addSuffix: true, locale: localeId })}`;
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username wajib diisi';
  if (username.length < 3) return 'Minimal 3 karakter';
  if (username.length > 30) return 'Maksimal 30 karakter';
  if (!/^[a-zA-Z0-9._]+$/.test(username)) return 'Hanya huruf, angka, titik, dan underscore';
  if (username.startsWith('.') || username.endsWith('.')) return 'Tidak boleh diawali/diakhiri titik';
  return null;
}

export function sanitizeText(text: string, max = 4000): string {
  return text.trim().slice(0, max);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

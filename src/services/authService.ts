import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import { auth, db } from '../lib/firebase';
import type { UserProfile, PrivacySettings } from '../types';
import { validateUsername, generateId } from '../lib/utils';

const DEFAULT_PRIVACY: PrivacySettings = {
  lastSeen: 'everyone',
  profilePhoto: 'everyone',
  about: 'everyone',
  status: 'contacts',
  readReceipts: true,
};

/** Register with username + password (phone optional). Email derived from username for Firebase Auth. */
export async function registerWithUsername(
  username: string,
  password: string,
  displayName: string,
  phone?: string
): Promise<UserProfile> {
  const err = validateUsername(username);
  if (err) throw new Error(err);
  if (password.length < 6) throw new Error('Password minimal 6 karakter');

  const usernameLower = username.toLowerCase();
  // Check uniqueness
  const unameSnap = await get(ref(db, `usernames/${usernameLower}`));
  if (unameSnap.exists()) throw new Error('Username sudah digunakan');

  const email = `${usernameLower}@yessapp.local`;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName });

  const profile: UserProfile = {
    uid,
    username: usernameLower,
    displayName: displayName.trim() || usernameLower,
    phone: phone?.trim() || undefined,
    photoURL: '',
    bio: '',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    privacy: DEFAULT_PRIVACY,
  };

  await set(ref(db, `users/${uid}`), profile);
  await set(ref(db, `usernames/${usernameLower}`), { uid, createdAt: Date.now() });

  return profile;
}

export async function loginWithUsername(username: string, password: string): Promise<User> {
  const email = `${username.toLowerCase().trim()}@yessapp.local`;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await update(ref(db, `users/${user.uid}`), {
      isOnline: false,
      lastSeen: Date.now(),
    });
  }
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export function subscribeUserProfile(uid: string, cb: (p: UserProfile | null) => void) {
  return onValue(ref(db, `users/${uid}`), (snap) => {
    cb(snap.exists() ? (snap.val() as UserProfile) : null);
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const payload = { ...data, updatedAt: Date.now() };
  await update(ref(db, `users/${uid}`), payload);
  if (data.displayName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.displayName });
  }
}

export async function changeUsername(uid: string, oldUsername: string, newUsername: string) {
  const err = validateUsername(newUsername);
  if (err) throw new Error(err);
  const lower = newUsername.toLowerCase();
  if (lower === oldUsername.toLowerCase()) return;

  const exists = await get(ref(db, `usernames/${lower}`));
  if (exists.exists()) throw new Error('Username sudah digunakan');

  await set(ref(db, `usernames/${lower}`), { uid, createdAt: Date.now() });
  await update(ref(db, `users/${uid}`), { username: lower, updatedAt: Date.now() });
  // remove old mapping (best-effort)
  await set(ref(db, `usernames/${oldUsername.toLowerCase()}`), null);
}

/** Presence: online + lastSeen + onDisconnect */
export function setupPresence(uid: string) {
  const statusRef = ref(db, `users/${uid}`);
  const connectedRef = ref(db, '.info/connected');

  const unsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(statusRef).update({
        isOnline: false,
        lastSeen: serverTimestamp() as unknown as number,
      });
      update(statusRef, { isOnline: true, lastSeen: Date.now() });
    }
  });

  return unsub;
}

export async function searchByUsername(username: string): Promise<UserProfile | null> {
  const lower = username.toLowerCase().trim();
  if (!lower) return null;
  const unameSnap = await get(ref(db, `usernames/${lower}`));
  if (!unameSnap.exists()) return null;
  const { uid } = unameSnap.val();
  return fetchUserProfile(uid);
}

export async function searchUsersByDisplayName(q: string, limit = 20): Promise<UserProfile[]> {
  // Simple client-side filter after fetch is not scalable; for production use Algolia/Elastic or Cloud Function.
  // Here we use username index primarily.
  const result = await searchByUsername(q);
  return result ? [result] : [];
}

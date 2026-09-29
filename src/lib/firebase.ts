import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase config from provided google-services style JSON
// IMPORTANT: In production move API keys to env vars and restrict by domain/app
const firebaseConfig = {
  apiKey: 'AIzaSyBzhY2NDPyncHXVs17NWSWPjw2D1QEBZIw',
  authDomain: 'chatweb-89d9d.firebaseapp.com',
  databaseURL: 'https://chatweb-89d9d-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'chatweb-89d9d',
  storageBucket: 'chatweb-89d9d.firebasestorage.app',
  messagingSenderId: '604315412423',
  appId: '1:604315412423:android:652f29c2c7d7b26b001be2',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;

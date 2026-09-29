# YessApp

Messaging app modern (Firebase Auth + Realtime Database).  
**Tidak butuh VPS** — frontend di-host gratis, backend Firebase.

## Cara jalan lokal

```bash
npm install
npm run dev
```

## Deploy (pilih salah satu — gratis)

### Opsi 1 — Vercel (paling mudah)

1. Push repo ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo
3. Framework: Vite (otomatis) → **Deploy**
4. Selesai. URL langsung hidup.

Setiap `git push` ke `main` = auto redeploy.

### Opsi 2 — Netlify

1. Push ke GitHub
2. [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Build command: `npm run build`  
   Publish directory: `dist`
4. Deploy

### Opsi 3 — Firebase Hosting (satu ekosistem)

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting
```

Project ID sudah di-set: `chatweb-89d9d`

---

## Setup Firebase Console (sekali saja)

1. [console.firebase.google.com](https://console.firebase.google.com) → project **chatweb-89d9d**
2. **Authentication** → Sign-in method → **Email/Password** → Enable
3. **Realtime Database** → pastikan sudah dibuat (region asia-southeast1)
4. Rules (sementara development):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

5. (Opsional) **Authentication** → Settings → Authorized domains  
   Tambah domain Vercel/Netlify kamu (mis. `yessapp.vercel.app`)

---

## Push ke GitHub

```bash
cd yessapp
git init
git add .
git commit -m "YessApp initial"
git branch -M main
git remote add origin https://github.com/USERNAME/yessapp.git
git push -u origin main
```

Lalu connect ke Vercel/Netlify seperti di atas.

---

## Fitur yang sudah ada

- Login / daftar username
- Chat private realtime
- Typing indicator, read receipts
- Online / last seen
- Edit profil (nama, username, bio)
- 5 tema + dark mode
- UI mobile-first

## Belum (bisa ditambah bertahap)

Voice note, call, status 24h, group, channel, FCM push — tetap tanpa VPS (pakai Firebase + WebRTC peer).

---

## Catatan

- Tidak ada server sendiri. Firebase = backend.
- Deploy = static files (`dist/`) saja.
- Domain custom bisa di Vercel/Netlify gratis.

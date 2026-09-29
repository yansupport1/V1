import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import {
  registerWithUsername,
  loginWithUsername,
  fetchUserProfile,
  setupPresence,
} from '../services/authService';
import { useAuthStore } from '../stores/authStore';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const profile = await registerWithUsername(
          username.trim(),
          password,
          displayName.trim() || username.trim(),
          phone.trim() || undefined
        );
        setUser(profile);
        setupPresence(profile.uid);
      } else {
        const fbUser = await loginWithUsername(username.trim(), password);
        const profile = await fetchUserProfile(fbUser.uid);
        if (!profile) throw new Error('Profil tidak ditemukan');
        setUser(profile);
        setupPresence(profile.uid);
      }
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found')) {
        setError('Username atau password salah');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('Username sudah terdaftar');
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm glass rounded-3xl p-8 shadow-glass">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shadow-soft mb-4">
            <MessageCircle className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">YessApp</h1>
          <p className="text-sm text-muted mt-1">
            {mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun baru'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Input
              id="displayName"
              label="Nama tampilan"
              placeholder="Nama lengkap"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          )}
          <Input
            id="username"
            label="Username"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            autoComplete="username"
            required
          />
          {mode === 'register' && (
            <Input
              id="phone"
              label="Nomor telepon (opsional)"
              placeholder="+62..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          )}
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading} size="lg">
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button
                type="button"
                className="text-accent font-medium hover:underline"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                type="button"
                className="text-accent font-medium hover:underline"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Masuk
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

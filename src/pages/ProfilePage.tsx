import { useState } from 'react';
import {
  User,
  AtSign,
  Info,
  LogOut,
  ChevronRight,
  Camera,
  Shield,
  Bell,
  Palette,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuthStore } from '../stores/authStore';
import { logout, updateUserProfile, changeUsername } from '../services/authService';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateLocal = useAuthStore((s) => s.updateProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<'name' | 'username' | 'bio' | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const openEdit = (field: 'name' | 'username' | 'bio') => {
    setEditing(field);
    setValue(
      field === 'name' ? user.displayName : field === 'username' ? user.username : user.bio || ''
    );
    setError('');
  };

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    setError('');
    try {
      if (editing === 'name') {
        await updateUserProfile(user.uid, { displayName: value.trim() });
        updateLocal({ displayName: value.trim() });
      } else if (editing === 'bio') {
        await updateUserProfile(user.uid, { bio: value.trim().slice(0, 139) });
        updateLocal({ bio: value.trim().slice(0, 139) });
      } else if (editing === 'username') {
        await changeUsername(user.uid, user.username, value.trim());
        updateLocal({ username: value.trim().toLowerCase() });
      }
      setEditing(null);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const menu = [
    { icon: Shield, label: 'Privasi', to: '/settings/privacy' },
    { icon: Bell, label: 'Notifikasi', to: '/settings/notifications' },
    { icon: Palette, label: 'Tampilan', to: '/settings/appearance' },
    { icon: HelpCircle, label: 'Bantuan', to: '/settings/help' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <header className="safe-top px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Profil</h1>
      </header>

      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <Avatar src={user.photoURL} name={user.displayName} size="xl" />
          <button className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center shadow-soft">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-bold">{user.displayName}</h2>
        <p className="text-muted text-sm">@{user.username}</p>
      </div>

      <div className="px-4 space-y-1">
        <button
          onClick={() => openEdit('name')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-2 transition"
        >
          <User className="h-5 w-5 text-accent" />
          <div className="flex-1 text-left">
            <p className="text-xs text-muted">Nama</p>
            <p className="font-medium">{user.displayName}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>
        <button
          onClick={() => openEdit('username')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-2 transition"
        >
          <AtSign className="h-5 w-5 text-accent" />
          <div className="flex-1 text-left">
            <p className="text-xs text-muted">Username</p>
            <p className="font-medium">@{user.username}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>
        <button
          onClick={() => openEdit('bio')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-2 transition"
        >
          <Info className="h-5 w-5 text-accent" />
          <div className="flex-1 text-left">
            <p className="text-xs text-muted">Bio</p>
            <p className="font-medium">{user.bio || 'Tambahkan bio'}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>
      </div>

      <div className="px-4 mt-6 space-y-1">
        {menu.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-2 transition"
          >
            <item.icon className="h-5 w-5 text-accent" />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </button>
        ))}
      </div>

      <div className="px-4 mt-8 mb-10">
        <Button variant="danger" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-lg glass rounded-t-3xl sm:rounded-3xl p-6 safe-bottom">
            <h3 className="text-lg font-bold mb-4">
              Edit {editing === 'name' ? 'Nama' : editing === 'username' ? 'Username' : 'Bio'}
            </h3>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              maxLength={editing === 'bio' ? 139 : 30}
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button className="flex-1" loading={loading} onClick={save}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

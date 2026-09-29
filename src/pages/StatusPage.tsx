import { CircleDot, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Avatar } from '../components/common/Avatar';

export function StatusPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="h-full flex flex-col">
      <header className="safe-top px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Status</h1>
      </header>

      <div className="px-4 py-3">
        <button className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-surface-2 transition">
          <div className="relative">
            <Avatar src={user?.photoURL} name={user?.displayName || ''} size="lg" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center border-2 border-surface">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-left">
            <p className="font-semibold">Status saya</p>
            <p className="text-sm text-muted">Ketuk untuk menambahkan status</p>
          </div>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-muted px-8 text-center">
        <CircleDot className="h-14 w-14 mb-3 opacity-40" />
        <p className="font-medium text-[var(--color-text)]">Belum ada status terbaru</p>
        <p className="text-sm mt-1">
          Status kontak akan muncul di sini selama 24 jam
        </p>
      </div>
    </div>
  );
}

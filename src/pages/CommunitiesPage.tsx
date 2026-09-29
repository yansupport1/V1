import { Users, Plus } from 'lucide-react';
import { Button } from '../components/common/Button';

export function CommunitiesPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="safe-top px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Komunitas</h1>
        <button className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center">
          <Plus className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-muted px-8 text-center">
        <Users className="h-14 w-14 mb-3 opacity-40" />
        <p className="font-medium text-[var(--color-text)]">Belum ada grup / channel</p>
        <p className="text-sm mt-1 mb-4">
          Buat grup atau channel untuk broadcast & diskusi
        </p>
        <Button size="sm">Buat komunitas</Button>
      </div>
    </div>
  );
}

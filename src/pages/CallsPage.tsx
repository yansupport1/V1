import { Phone, PhoneMissed, Video } from 'lucide-react';

export function CallsPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="safe-top px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Panggilan</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-muted px-8 text-center">
        <Phone className="h-14 w-14 mb-3 opacity-40" />
        <p className="font-medium text-[var(--color-text)]">Belum ada riwayat panggilan</p>
        <p className="text-sm mt-1">
          Panggilan suara & video 1-on-1 akan tercatat di sini
        </p>
      </div>
    </div>
  );
}

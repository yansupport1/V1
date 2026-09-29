import { useEffect, useRef, useState } from 'react';
import { CircleDot, Plus, X, Image as ImageIcon, Type, Loader2, Eye } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import {
  createStatus,
  deleteStatus,
  subscribeMyStatuses,
  fetchContactsStatuses,
  markStatusViewed,
} from '../services/statusService';
import { subscribeContacts } from '../services/chatService';
import { compressImage, uploadFile } from '../services/mediaService';
import type { StatusItem } from '../types';
import { formatMessageTime, cn } from '../lib/utils';

const BG_COLORS = ['#128C7E', '#075E54', '#34B7F1', '#7C3AED', '#E11D48', '#EA580C', '#111827'];

export function StatusPage() {
  const user = useAuthStore((s) => s.user);
  const [myStatuses, setMyStatuses] = useState<StatusItem[]>([]);
  const [contactStatuses, setContactStatuses] = useState<
    { uid: string; name: string; photo?: string; items: StatusItem[] }[]
  >([]);
  const [composer, setComposer] = useState(false);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [caption, setCaption] = useState('');
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<StatusItem[] | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeMyStatuses(user.uid, setMyStatuses);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeContacts(user.uid, async (contacts) => {
      const uids = contacts.map((c: any) => c.uid).filter(Boolean);
      const map = await fetchContactsStatuses(uids);
      const rows = contacts
        .filter((c: any) => map[c.uid]?.length)
        .map((c: any) => ({
          uid: c.uid,
          name: c.displayName || c.username,
          photo: c.photoURL,
          items: map[c.uid],
        }));
      setContactStatuses(rows);
    });
  }, [user]);

  const publish = async () => {
    if (!user) return;
    if (mode === 'text' && !caption.trim()) return;
    if (mode === 'image' && !imageFile) return;
    setLoading(true);
    try {
      let mediaUrl = '';
      if (mode === 'image' && imageFile) {
        const compressed = await compressImage(imageFile);
        const up = await uploadFile(compressed, `status/${user.uid}`);
        mediaUrl = up.url;
      }
      await createStatus({
        uid: user.uid,
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL,
        type: mode,
        text: caption.trim(),
        mediaUrl,
        backgroundColor: bg,
      });
      setComposer(false);
      setCaption('');
      setImageFile(null);
      setPreviewUrl('');
    } catch (e: any) {
      alert(e?.message || 'Gagal membuat status');
    } finally {
      setLoading(false);
    }
  };

  const openViewer = async (items: StatusItem[], start = 0) => {
    setViewing(items);
    setViewIdx(start);
    const cur = items[start];
    if (cur && user) await markStatusViewed(cur.uid, cur.id, user.uid);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="safe-top px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Status</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* My status */}
        <button
          type="button"
          onClick={() => (myStatuses.length ? openViewer(myStatuses) : setComposer(true))}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition"
        >
          <div className="relative">
            <div
              className={cn(
                'rounded-full p-0.5',
                myStatuses.length ? 'bg-gradient-to-tr from-accent to-emerald-400' : ''
              )}
            >
              <Avatar src={user?.photoURL} name={user?.displayName || ''} size="lg" />
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setComposer(true);
              }}
              className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center border-2 border-surface"
            >
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold">Status saya</p>
            <p className="text-sm text-muted">
              {myStatuses.length
                ? `${myStatuses.length} status · ketuk untuk lihat`
                : 'Ketuk untuk menambahkan status'}
            </p>
          </div>
        </button>

        {myStatuses.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {myStatuses.map((s) => (
              <div key={s.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => openViewer(myStatuses, myStatuses.indexOf(s))}
                  className="h-16 w-16 rounded-xl overflow-hidden border border-border"
                  style={{ background: s.backgroundColor }}
                >
                  {s.mediaUrl ? (
                    <img src={s.mediaUrl} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <span className="text-[10px] text-white p-1 line-clamp-3">{s.text}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => user && deleteStatus(user.uid, s.id)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wide">
          Pembaruan terkini
        </p>

        {contactStatuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted px-8 text-center">
            <CircleDot className="h-14 w-14 mb-3 opacity-40" />
            <p className="font-medium text-[var(--color-text)]">Belum ada status terbaru</p>
            <p className="text-sm mt-1">Status kontak muncul di sini selama 24 jam</p>
          </div>
        ) : (
          contactStatuses.map((row) => (
            <button
              key={row.uid}
              type="button"
              onClick={() => openViewer(row.items)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition text-left"
            >
              <div className="rounded-full p-0.5 bg-gradient-to-tr from-accent to-sky-400">
                <Avatar src={row.photo} name={row.name} size="lg" />
              </div>
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-sm text-muted">
                  {formatMessageTime(row.items[row.items.length - 1].createdAt)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Composer modal */}
      {composer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="safe-top flex items-center justify-between px-3 h-12 text-white">
            <button type="button" onClick={() => setComposer(false)}>
              <X className="h-6 w-6" />
            </button>
            <span className="font-semibold">Status baru</span>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
            {mode === 'text' ? (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                placeholder="Ketik status..."
                className="w-full max-w-md h-40 bg-transparent text-white text-2xl text-center resize-none focus:outline-none placeholder:text-white/40"
                style={{ caretColor: 'white' }}
                autoFocus
              />
            ) : previewUrl ? (
              <div className="relative w-full max-w-md">
                <img src={previewUrl} alt="" className="w-full max-h-[50vh] object-contain rounded-xl" />
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                  placeholder="Tambah caption..."
                  className="mt-3 w-full h-11 px-4 rounded-xl bg-white/10 text-white placeholder:text-white/50 border border-white/20"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 text-white/80"
              >
                <ImageIcon className="h-16 w-16" />
                Pilih foto
              </button>
            )}
          </div>

          {mode === 'text' && (
            <div className="flex justify-center gap-2 pb-3">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBg(c)}
                  className={cn(
                    'h-8 w-8 rounded-full border-2',
                    bg === c ? 'border-white scale-110' : 'border-transparent'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}

          <div
            className="composer-bar flex items-center gap-2 px-3"
            style={{ background: mode === 'text' ? bg : '#111' }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setImageFile(null);
                setPreviewUrl('');
              }}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-white',
                mode === 'text' && 'bg-white/20'
              )}
            >
              <Type className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('image');
                fileRef.current?.click();
              }}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-white',
                mode === 'image' && 'bg-white/20'
              )}
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <Button
              onClick={publish}
              loading={loading}
              disabled={mode === 'text' ? !caption.trim() : !imageFile}
              className="!bg-white !text-black"
            >
              Bagikan
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setMode('image');
              setImageFile(f);
              setPreviewUrl(URL.createObjectURL(f));
            }}
          />
        </div>
      )}

      {/* Viewer */}
      {viewing && viewing[viewIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => {
            if (viewIdx < viewing.length - 1) {
              const next = viewIdx + 1;
              setViewIdx(next);
              if (user) markStatusViewed(viewing[next].uid, viewing[next].id, user.uid);
            } else {
              setViewing(null);
            }
          }}
        >
          <div className="safe-top flex gap-1 px-2 pt-2">
            {viewing.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: i < viewIdx ? '100%' : i === viewIdx ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-white">
            <Avatar
              src={viewing[viewIdx].photoURL}
              name={viewing[viewIdx].displayName}
              size="sm"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">{viewing[viewIdx].displayName}</p>
              <p className="text-[11px] text-white/70">
                {formatMessageTime(viewing[viewIdx].createdAt)}
              </p>
            </div>
            {viewing[viewIdx].uid === user?.uid && (
              <span className="flex items-center gap-1 text-xs text-white/80">
                <Eye className="h-3.5 w-3.5" />
                {Object.keys(viewing[viewIdx].viewers || {}).length}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewing(null);
              }}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center px-4"
            style={{
              background:
                viewing[viewIdx].type === 'text' ? viewing[viewIdx].backgroundColor : '#000',
            }}
          >
            {viewing[viewIdx].mediaUrl ? (
              <div className="w-full max-w-lg">
                <img
                  src={viewing[viewIdx].mediaUrl}
                  alt=""
                  className="w-full max-h-[60vh] object-contain"
                />
                {viewing[viewIdx].text && (
                  <p className="text-white text-center mt-3 text-lg">{viewing[viewIdx].text}</p>
                )}
              </div>
            ) : (
              <p className="text-white text-2xl text-center font-medium max-w-md whitespace-pre-wrap">
                {viewing[viewIdx].text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

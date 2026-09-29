import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Radio, Link2, X } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuthStore } from '../stores/authStore';
import { createGroup, joinByInviteCode } from '../services/groupService';
import { createChannel } from '../services/channelService';
import { subscribeUserConversations, fetchConversation } from '../services/chatService';
import { Avatar } from '../components/common/Avatar';

type Row = { id: string; name: string; type: string; photoURL?: string };

export function CommunitiesPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [modal, setModal] = useState<'menu' | 'group' | 'channel' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [uname, setUname] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [invite, setInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeUserConversations(user.uid, async (items) => {
      const community = items.filter((i) => i.type === 'group' || i.type === 'channel');
      const enriched = await Promise.all(
        community.map(async (i) => {
          const c = await fetchConversation(i.id);
          return {
            id: i.id,
            name: c?.name || (i as any).name || 'Tanpa nama',
            type: i.type,
            photoURL: c?.photoURL,
          };
        })
      );
      setRows(enriched);
    });
  }, [user]);

  const submitGroup = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { convId, inviteLink } = await createGroup({
        name: name.trim(),
        description: desc,
        creatorUid: user.uid,
      });
      setCreatedLink(inviteLink);
      setModal(null);
      setName('');
      setDesc('');
      navigate(`/chat/${convId}`);
      // show link via alert for now after nav - store was set; use clipboard
      try {
        await navigator.clipboard.writeText(inviteLink);
        alert('Grup dibuat!\nLink undangan disalin:\n' + inviteLink);
      } catch {
        alert('Grup dibuat!\nLink undangan:\n' + inviteLink);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal');
    } finally {
      setLoading(false);
    }
  };

  const submitChannel = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = await createChannel({
        name: name.trim(),
        username: uname,
        description: desc,
        isPublic,
        creatorUid: user.uid,
      });
      setModal(null);
      setName('');
      setDesc('');
      setUname('');
      navigate(`/chat/${id}`);
    } catch (e: any) {
      setError(e.message || 'Gagal');
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    if (!user || !invite.trim()) return;
    setLoading(true);
    setError('');
    try {
      let code = invite.trim();
      const m = code.match(/\/join\/([a-z0-9]+)/i);
      if (m) code = m[1];
      const convId = await joinByInviteCode(code, user.uid);
      setModal(null);
      navigate(`/chat/${convId}`);
    } catch (e: any) {
      setError(e.message || 'Gagal join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="safe-top px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Komunitas</h1>
        <button
          type="button"
          onClick={() => setModal('menu')}
          className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted px-8 text-center">
            <Users className="h-14 w-14 mb-3 opacity-40" />
            <p className="font-medium text-[var(--color-text)]">Belum ada grup / channel</p>
            <p className="text-sm mt-1 mb-4">Buat grup, channel, atau join lewat link undangan</p>
            <Button size="sm" onClick={() => setModal('menu')}>
              Buat komunitas
            </Button>
          </div>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/chat/${r.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 text-left"
            >
              <Avatar src={r.photoURL} name={r.name} />
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted capitalize">{r.type}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-lg glass rounded-t-3xl sm:rounded-3xl p-6 safe-bottom space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === 'menu' && 'Komunitas'}
                {modal === 'group' && 'Buat grup'}
                {modal === 'channel' && 'Buat channel'}
                {modal === 'join' && 'Join via link'}
              </h2>
              <button type="button" onClick={() => setModal(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === 'menu' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setModal('group')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-surface-2"
                >
                  <Users className="h-5 w-5 text-accent" />
                  <span className="font-medium">Buat grup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal('channel')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-surface-2"
                >
                  <Radio className="h-5 w-5 text-accent" />
                  <span className="font-medium">Buat channel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal('join')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-surface-2"
                >
                  <Link2 className="h-5 w-5 text-accent" />
                  <span className="font-medium">Join link undangan</span>
                </button>
              </div>
            )}

            {modal === 'group' && (
              <>
                <Input label="Nama grup" value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  label="Deskripsi (opsional)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" loading={loading} onClick={submitGroup}>
                  Buat & salin link undangan
                </Button>
              </>
            )}

            {modal === 'channel' && (
              <>
                <Input label="Nama channel" value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  label="Username channel (opsional)"
                  value={uname}
                  onChange={(e) => setUname(e.target.value.toLowerCase())}
                  placeholder="berita_yess"
                />
                <Input
                  label="Deskripsi"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  Channel publik
                </label>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" loading={loading} onClick={submitChannel}>
                  Buat channel
                </Button>
              </>
            )}

            {modal === 'join' && (
              <>
                <Input
                  label="Link atau kode undangan"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="https://.../join/xxxx atau kode"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" loading={loading} onClick={submitJoin}>
                  Join grup
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

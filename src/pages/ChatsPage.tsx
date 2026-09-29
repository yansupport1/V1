import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { useAuthStore } from '../stores/authStore';
import {
  subscribeUserConversations,
  fetchConversation,
} from '../services/chatService';
import { fetchUserProfile } from '../services/authService';
import { formatMessageTime, cn } from '../lib/utils';
import type { Conversation, UserProfile } from '../types';

interface ChatRow {
  id: string;
  name: string;
  photoURL?: string;
  lastText?: string;
  timestamp?: number;
  unread?: number;
  isOnline?: boolean;
  otherUid?: string;
}

export function ChatsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserConversations(user.uid, async (items) => {
      const enriched: ChatRow[] = await Promise.all(
        items.map(async (item) => {
          const conv = await fetchConversation(item.id);
          let name = conv?.name || 'Chat';
          let photoURL: string | undefined;
          let isOnline = false;
          if (conv?.type === 'private' && item.otherUid) {
            const other = await fetchUserProfile(item.otherUid);
            if (other) {
              name = other.displayName || other.username;
              photoURL = other.photoURL;
              isOnline = other.isOnline;
            }
          }
          return {
            id: item.id,
            name,
            photoURL,
            lastText: conv?.lastMessage?.text,
            timestamp: conv?.lastMessage?.timestamp || item.updatedAt,
            isOnline,
            otherUid: item.otherUid,
          };
        })
      );
      setRows(enriched);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchUser = async () => {
    if (!searchUser.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const { searchByUsername } = await import('../services/authService');
      const p = await searchByUsername(searchUser.trim());
      setFoundUser(p);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (other: UserProfile) => {
    if (!user) return;
    const { getOrCreatePrivateConversation } = await import('../services/chatService');
    const { addContact } = await import('../services/chatService');
    const convId = await getOrCreatePrivateConversation(
      user.uid,
      other.uid,
      other.displayName,
      user.displayName
    );
    await addContact(user.uid, other.uid, {
      username: other.username,
      displayName: other.displayName,
      phone: other.phone,
      photoURL: other.photoURL,
    });
    setShowNew(false);
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="safe-top glass shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight">YessApp</h1>
          <button
            onClick={() => setShowNew(true)}
            className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white shadow-soft active:scale-95 transition"
            aria-label="Chat baru"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari atau mulai chat baru"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="skeleton h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted px-8 text-center">
            <MessageSquare className="h-14 w-14 mb-3 opacity-40" />
            <p className="font-medium text-[var(--color-text)]">Belum ada chat</p>
            <p className="text-sm mt-1">
              Ketuk + untuk mulai percakapan dengan username
            </p>
          </div>
        ) : (
          filtered.map((row) => (
            <button
              key={row.id}
              onClick={() => navigate(`/chat/${row.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 active:bg-surface-2 transition text-left"
            >
              <Avatar src={row.photoURL} name={row.name} online={row.isOnline} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold truncate">{row.name}</span>
                  {row.timestamp && (
                    <span className="text-[11px] text-muted shrink-0">
                      {formatMessageTime(row.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted truncate mt-0.5">
                  {row.lastText || 'Belum ada pesan'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New chat modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-lg glass rounded-t-3xl sm:rounded-3xl p-6 shadow-glass safe-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Chat baru</h2>
              <button
                onClick={() => setShowNew(false)}
                className="text-muted text-sm font-medium"
              >
                Tutup
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                placeholder="Cari username..."
                className="flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                autoFocus
              />
              <button
                onClick={handleSearchUser}
                disabled={searching}
                className="h-11 px-4 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
              >
                Cari
              </button>
            </div>
            {foundUser && (
              <button
                onClick={() => startChat(foundUser)}
                className="mt-4 w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition"
              >
                <Avatar src={foundUser.photoURL} name={foundUser.displayName} />
                <div className="text-left">
                  <p className="font-semibold">{foundUser.displayName}</p>
                  <p className="text-sm text-muted">@{foundUser.username}</p>
                </div>
              </button>
            )}
            {searchUser && !searching && foundUser === null && (
              <p className="mt-4 text-sm text-muted text-center">
                Username tidak ditemukan
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

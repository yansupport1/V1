import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Smile,
  Paperclip,
  Mic,
  Check,
  CheckCheck,
  Reply,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { useAuthStore } from '../stores/authStore';
import {
  subscribeRecentMessages,
  subscribeConversation,
  sendTextMessage,
  sendMediaMessage,
  setTyping,
  subscribeTyping,
  markMessagesRead,
} from '../services/chatService';
import { fetchUserProfile } from '../services/authService';
import { compressImage, uploadFile } from '../services/mediaService';
import { AI_UID, handleAiIncoming } from '../services/aiSupport';
import { formatMessageTime, cn, generateId } from '../lib/utils';
import type { Message, Conversation, UserProfile, TypingIndicator } from '../types';

const EMOJIS = [
  '😀','😂','🥰','😍','🤔','😎','😭','🔥','👍','👎','❤️','🎉',
  '🙏','👏','💯','✨','😊','😉','😅','🤗','😴','🤮','💪','🤝',
  '🌹','☕','🍕','🎵','📸','💬','✅','❌','⚡','🌟','😁','😜',
];

export function ChatRoomPage() {
  const { convId } = useParams<{ convId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [other, setOther] = useState<UserProfile | null>(null);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string; kind: 'image' | 'file' } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!convId || !user) return;

    const unsubConv = subscribeConversation(convId, async (c) => {
      setConv(c);
      if (c?.type === 'private') {
        const otherUid = Object.keys(c.members || {}).find((id) => id !== user.uid);
        if (otherUid) {
          const p = await fetchUserProfile(otherUid);
          setOther(p);
        }
      } else if (c?.type === 'group' || c?.type === 'channel') {
        setOther(null);
      }
    });

    const unsubMsg = subscribeRecentMessages(convId, (list) => {
      setMessages(list);
      const unread = list.filter((m) => m.senderId !== user.uid && m.status !== 'read');
      if (unread.length) {
        markMessagesRead(convId, user.uid, unread.map((m) => m.id));
      }
    });

    const unsubTyping = subscribeTyping(convId, user.uid, setTypingUsers);
    return () => {
      unsubConv();
      unsubMsg();
      unsubTyping();
    };
  }, [convId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length, showEmoji]);

  const handleTyping = (value: string) => {
    setText(value);
    if (!convId || !user) return;
    setTyping(convId, user.uid, user.displayName, true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(convId, user.uid, user.displayName, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || !convId || !user || sending) return;
    setSending(true);
    const clientId = generateId();
    const body = text.trim();
    const optimistic: Message = {
      id: clientId,
      clientId,
      conversationId: convId,
      senderId: user.uid,
      senderName: user.displayName,
      type: 'text',
      text: body,
      status: 'sending',
      createdAt: Date.now(),
      replyTo: replyTo
        ? {
            messageId: replyTo.id,
            text: replyTo.text,
            type: replyTo.type,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
          }
        : undefined,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setReplyTo(null);
    setShowEmoji(false);
    setTyping(convId, user.uid, user.displayName, false);

    try {
      await sendTextMessage(
        convId,
        user.uid,
        user.displayName,
        body,
        optimistic.replyTo,
        clientId
      );
      // AI auto-reply
      if (other?.uid === AI_UID) {
        handleAiIncoming(convId, user, body).catch(console.warn);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setShowAttach(false);
    const url = URL.createObjectURL(file);
    setPreview({ file, url, kind: 'image' });
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setShowAttach(false);
    setPreview({ file, url: '', kind: 'file' });
  };

  const sendPreview = async () => {
    if (!preview || !convId || !user || sending) return;
    setSending(true);
    setUploadPct(0);
    try {
      let file = preview.file;
      let type: Message['type'] = 'file';
      if (preview.kind === 'image') {
        file = await compressImage(file);
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      }
      const up = await uploadFile(file, `chat/${convId}`, setUploadPct);
      await sendMediaMessage(convId, user.uid, user.displayName, type, up.url, {
        text: text.trim() || undefined,
        mediaMime: up.mime,
        mediaSize: up.size,
        fileName: up.name,
        clientId: generateId(),
      });
      setText('');
      setPreview(null);
    } catch (err: any) {
      alert(err?.message || 'Upload gagal. Pastikan Firebase Storage aktif & rules mengizinkan.');
    } finally {
      setSending(false);
      setUploadPct(null);
    }
  };

  const headerName =
    conv?.type === 'group' || conv?.type === 'channel'
      ? conv.name || 'Chat'
      : other?.displayName || conv?.name || 'Chat';
  const headerSub = typingUsers.length
    ? 'sedang mengetik...'
    : conv?.type === 'group'
      ? `${Object.keys(conv.members || {}).length} anggota`
      : conv?.type === 'channel'
        ? 'Channel'
        : other?.isOnline
          ? 'online'
          : other?.lastSeen
            ? `terakhir dilihat ${formatMessageTime(other.lastSeen)}`
            : '';

  return (
    <div className="chat-shell bg-[var(--color-bg)]">
      {/* Header */}
      <header className="safe-top glass shrink-0 flex items-center gap-1 px-1 h-14 border-b border-border z-10">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar
          src={other?.photoURL || conv?.photoURL}
          name={headerName}
          size="sm"
          online={other?.isOnline}
        />
        <div className="flex-1 min-w-0 px-1">
          <p className="font-semibold truncate text-sm leading-tight">{headerName}</p>
          <p className={cn('text-[11px] truncate', typingUsers.length ? 'text-accent' : 'text-muted')}>
            {headerSub}
          </p>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2 text-accent">
          <Video className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2 text-accent">
          <Phone className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2">
          <MoreVertical className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {messages.map((msg) => {
          if (msg.deletedFor?.[user!.uid]) return null;
          const isOut = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[78%] px-3 py-1.5 shadow-sm',
                  isOut ? 'msg-out' : 'msg-in'
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setReplyTo(msg);
                }}
              >
                {!isOut && conv?.type === 'group' && (
                  <p className="text-[11px] font-semibold text-accent mb-0.5">
                    {msg.senderName}
                  </p>
                )}
                {msg.replyTo && (
                  <div className="border-l-2 border-accent pl-2 mb-1 text-xs opacity-80">
                    <p className="font-medium text-accent">{msg.replyTo.senderName || 'Pesan'}</p>
                    <p className="truncate">{msg.replyTo.text || 'Media'}</p>
                  </div>
                )}
                {msg.deletedForEveryone ? (
                  <p className="text-sm italic text-muted">Pesan dihapus</p>
                ) : msg.type === 'image' && msg.mediaUrl ? (
                  <div>
                    <img
                      src={msg.mediaUrl}
                      alt=""
                      className="rounded-lg max-w-full max-h-64 object-cover mb-1"
                      loading="lazy"
                    />
                    {msg.text && (
                      <p className="text-[15px] whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                ) : msg.type === 'file' && msg.mediaUrl ? (
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm underline"
                  >
                    <FileText className="h-4 w-4" />
                    {msg.fileName || 'File'}
                  </a>
                ) : (
                  <p className="text-[15px] whitespace-pre-wrap break-words leading-snug">
                    {msg.text}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {msg.editedAt && <span className="text-[10px] text-muted">diedit</span>}
                  <span className="text-[10px] text-muted">{formatMessageTime(msg.createdAt)}</span>
                  {isOut && (
                    <span className="text-muted">
                      {msg.status === 'read' ? (
                        <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                      ) : msg.status === 'delivered' || msg.status === 'sent' ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : msg.status === 'sending' ? (
                        <Check className="h-3.5 w-3.5 opacity-50" />
                      ) : (
                        <span className="text-red-400 text-[10px]">!</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="msg-in px-4 py-2 text-sm text-muted italic">
              {typingUsers[0].displayName} sedang mengetik...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Emoji panel */}
      {showEmoji && (
        <div className="glass border-t border-border emoji-grid shrink-0">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="text-xl h-9 w-full rounded-lg hover:bg-surface-2"
              onClick={() => {
                setText((t) => t + e);
                inputRef.current?.focus();
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Attach menu */}
      {showAttach && (
        <div className="glass border-t border-border px-4 py-3 flex gap-4 shrink-0">
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <span className="h-12 w-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </span>
            Galeri
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <span className="h-12 w-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </span>
            Dokumen
          </button>
          <button
            type="button"
            onClick={() => setShowAttach(false)}
            className="flex flex-col items-center gap-1 text-xs ml-auto"
          >
            <span className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center">
              <X className="h-5 w-5" />
            </span>
            Tutup
          </button>
        </div>
      )}

      {/* Media preview before send */}
      {preview && (
        <div className="glass border-t border-border p-3 shrink-0 space-y-2">
          <div className="flex items-start gap-3">
            {preview.kind === 'image' ? (
              <img src={preview.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-surface-2 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{preview.file.name}</p>
              <p className="text-xs text-muted">
                {(preview.file.size / 1024).toFixed(0)} KB
              </p>
              {uploadPct !== null && (
                <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${uploadPct}%` }} />
                </div>
              )}
            </div>
            <button type="button" onClick={() => setPreview(null)} className="p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tambah caption..."
              className="flex-1 h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm"
            />
            <button
              type="button"
              onClick={sendPreview}
              disabled={sending}
              className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && !preview && (
        <div className="px-3 py-2 bg-surface border-t border-border flex items-center gap-2 shrink-0">
          <Reply className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium text-accent">Membalas {replyTo.senderName || 'pesan'}</p>
            <p className="truncate text-muted">{replyTo.text || 'Media'}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="text-muted text-sm px-2">
            ✕
          </button>
        </div>
      )}

      {/* Composer — fixed safe area */}
      {!preview && (
        <div className="composer-bar glass border-t border-border flex items-end gap-1 shrink-0 z-10">
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowAttach(false);
            }}
            className={cn(
              'h-10 w-10 flex items-center justify-center rounded-full shrink-0',
              showEmoji ? 'text-accent bg-accent-soft' : 'text-muted hover:bg-surface-2'
            )}
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAttach((v) => !v);
              setShowEmoji(false);
            }}
            className={cn(
              'h-10 w-10 flex items-center justify-center rounded-full shrink-0',
              showAttach ? 'text-accent bg-accent-soft' : 'text-muted hover:bg-surface-2'
            )}
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesan"
            className="flex-1 min-h-[40px] max-h-32 px-4 py-2 rounded-3xl bg-surface-2 border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white shadow-soft shrink-0 active:scale-95 transition"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white shadow-soft shrink-0 opacity-80"
              title="Voice note (segera)"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
      <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
    </div>
  );
}

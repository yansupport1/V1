import { useEffect, useRef, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { useAuthStore } from '../stores/authStore';
import {
  subscribeRecentMessages,
  subscribeConversation,
  sendTextMessage,
  setTyping,
  subscribeTyping,
  markMessagesRead,
  loadOlderMessages,
} from '../services/chatService';
import { fetchUserProfile } from '../services/authService';
import { formatMessageTime, cn, generateId } from '../lib/utils';
import type { Message, Conversation, UserProfile, TypingIndicator } from '../types';

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

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
      }
    });

    const unsubMsg = subscribeRecentMessages(convId, (list) => {
      setMessages(list);
      // mark read
      const unread = list.filter(
        (m) => m.senderId !== user.uid && m.status !== 'read'
      );
      if (unread.length) {
        markMessagesRead(
          convId,
          user.uid,
          unread.map((m) => m.id)
        );
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
  }, [messages.length, typingUsers.length]);

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
    const optimistic: Message = {
      id: clientId,
      clientId,
      conversationId: convId,
      senderId: user.uid,
      senderName: user.displayName,
      type: 'text',
      text: text.trim(),
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
    setTyping(convId, user.uid, user.displayName, false);

    try {
      await sendTextMessage(
        convId,
        user.uid,
        user.displayName,
        optimistic.text!,
        optimistic.replyTo,
        clientId
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: 'failed' } : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const headerName = other?.displayName || conv?.name || 'Chat';
  const headerSub = typingUsers.length
    ? 'sedang mengetik...'
    : other?.isOnline
      ? 'online'
      : other?.lastSeen
        ? `terakhir dilihat ${formatMessageTime(other.lastSeen)}`
        : '';

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="safe-top glass shrink-0 flex items-center gap-2 px-2 h-14 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar src={other?.photoURL} name={headerName} size="sm" online={other?.isOnline} />
        <div className="flex-1 min-w-0" onClick={() => other && navigate(`/user/${other.uid}`)}>
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
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.map((msg) => {
          if (msg.deletedFor?.[user!.uid] || (msg.deletedForEveryone && msg.senderId !== user!.uid))
            return null;
          const isOut = msg.senderId === user?.uid;
          return (
            <div
              key={msg.id}
              className={cn('flex', isOut ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[78%] px-3 py-1.5 shadow-sm relative group',
                  isOut ? 'msg-out' : 'msg-in'
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setReplyTo(msg);
                }}
              >
                {msg.replyTo && (
                  <div className="border-l-2 border-accent pl-2 mb-1 text-xs opacity-80">
                    <p className="font-medium text-accent">
                      {msg.replyTo.senderName || 'Pesan'}
                    </p>
                    <p className="truncate">{msg.replyTo.text || 'Media'}</p>
                  </div>
                )}
                {msg.deletedForEveryone ? (
                  <p className="text-sm italic text-muted">Pesan dihapus</p>
                ) : (
                  <p className="text-[15px] whitespace-pre-wrap break-words leading-snug">
                    {msg.text}
                  </p>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {msg.editedAt && (
                    <span className="text-[10px] text-muted">diedit</span>
                  )}
                  <span className="text-[10px] text-muted">
                    {formatMessageTime(msg.createdAt)}
                  </span>
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

      {/* Reply bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-surface border-t border-border flex items-center gap-2">
          <Reply className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium text-accent">
              Membalas {replyTo.senderName || 'pesan'}
            </p>
            <p className="truncate text-muted">{replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted text-sm px-2">
            ✕
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="safe-bottom glass border-t border-border px-2 py-2 flex items-end gap-1.5">
        <button className="h-10 w-10 flex items-center justify-center rounded-full text-muted hover:bg-surface-2 shrink-0">
          <Smile className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 flex items-center justify-center rounded-full text-muted hover:bg-surface-2 shrink-0">
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
          className="flex-1 min-h-[40px] max-h-32 px-4 py-2 rounded-3xl bg-surface-2 border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white shadow-soft shrink-0 active:scale-95 transition"
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <button className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white shadow-soft shrink-0">
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

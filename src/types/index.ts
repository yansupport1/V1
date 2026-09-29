export type ThemeId = 'glassmorph' | 'default' | 'soft-red' | 'soft-cyan' | 'soft-green';
export type ColorMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  status?: string;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
  privacy: PrivacySettings;
}

export interface PrivacySettings {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  about: 'everyone' | 'contacts' | 'nobody';
  status: 'everyone' | 'contacts' | 'contacts_except' | 'only_share';
  readReceipts: boolean;
}

export interface Contact {
  uid: string;
  username: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  addedAt: number;
  blocked?: boolean;
}

export type ConversationType = 'private' | 'group' | 'channel';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  photoURL?: string;
  description?: string;
  members: Record<string, ConversationMember>;
  lastMessage?: LastMessage;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  pinnedMessageId?: string;
  settings?: GroupSettings | ChannelSettings;
}

export interface ConversationMember {
  uid: string;
  role: 'owner' | 'admin' | 'member' | 'subscriber';
  joinedAt: number;
  muted?: boolean;
  mutedUntil?: number;
}

export interface GroupSettings {
  onlyAdminsCanMessage: boolean;
  onlyAdminsCanEditInfo: boolean;
  disappearingMessages?: number; // seconds, 0 = off
}

export interface ChannelSettings {
  isPublic: boolean;
  username?: string;
  subscriberCount: number;
}

export interface LastMessage {
  id: string;
  text?: string;
  type: MessageType;
  senderId: string;
  senderName?: string;
  timestamp: number;
  status: MessageStatus;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'file'
  | 'location'
  | 'contact'
  | 'poll'
  | 'sticker'
  | 'gif'
  | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaThumbnail?: string;
  mediaMime?: string;
  mediaSize?: number;
  mediaDuration?: number; // for voice/video/audio seconds
  fileName?: string;
  replyTo?: ReplyRef;
  forwardFrom?: ForwardRef;
  reactions?: Record<string, string[]>; // emoji -> uid[]
  mentions?: string[];
  pollId?: string;
  location?: { lat: number; lng: number; name?: string };
  contactShare?: { uid?: string; name: string; phone?: string };
  status: MessageStatus;
  editedAt?: number;
  deletedFor?: Record<string, boolean>;
  deletedForEveryone?: boolean;
  pinned?: boolean;
  starredBy?: Record<string, boolean>;
  createdAt: number;
  clientId?: string; // for optimistic UI
}

export interface ReplyRef {
  messageId: string;
  text?: string;
  type: MessageType;
  senderId: string;
  senderName?: string;
}

export interface ForwardRef {
  conversationId: string;
  messageId: string;
  senderName?: string;
}

export interface TypingIndicator {
  uid: string;
  displayName: string;
  timestamp: number;
}

export interface CallSession {
  id: string;
  type: 'voice' | 'video';
  conversationId?: string;
  callerId: string;
  calleeId: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'busy';
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

export interface StatusItem {
  id: string;
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  type: 'text' | 'image' | 'video';
  text?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  createdAt: number;
  expiresAt: number;
  viewers: Record<string, number>; // uid -> viewedAt
  privacy: 'contacts' | 'contacts_except' | 'only_share';
  exceptUids?: string[];
  onlyUids?: string[];
}

export interface Poll {
  id: string;
  conversationId: string;
  messageId: string;
  question: string;
  options: PollOption[];
  multiple: boolean;
  allowChange: boolean;
  createdBy: string;
  createdAt: number;
  closed?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: Record<string, number>; // uid -> timestamp
}

export interface NotificationPrefs {
  messages: boolean;
  groups: boolean;
  channels: boolean;
  calls: boolean;
  status: boolean;
  mentions: boolean;
  sound: boolean;
  vibration: boolean;
}

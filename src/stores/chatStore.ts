import { create } from 'zustand';
import type { Conversation, Message, TypingIndicator } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typing: Record<string, TypingIndicator[]>;
  unread: Record<string, number>;
  setConversations: (c: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (convId: string, messages: Message[]) => void;
  prependMessages: (convId: string, messages: Message[]) => void;
  addMessage: (convId: string, message: Message) => void;
  updateMessage: (convId: string, messageId: string, partial: Partial<Message>) => void;
  setTyping: (convId: string, list: TypingIndicator[]) => void;
  setUnread: (convId: string, count: number) => void;
  incrementUnread: (convId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typing: {},
  unread: {},
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setMessages: (convId, messages) =>
    set((s) => ({ messages: { ...s.messages, [convId]: messages } })),
  prependMessages: (convId, older) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: [...older, ...(s.messages[convId] || [])],
      },
    })),
  addMessage: (convId, message) =>
    set((s) => {
      const list = s.messages[convId] || [];
      // dedupe by id or clientId
      if (list.some((m) => m.id === message.id || (message.clientId && m.clientId === message.clientId))) {
        return {
          messages: {
            ...s.messages,
            [convId]: list.map((m) =>
              m.id === message.id || (message.clientId && m.clientId === message.clientId)
                ? { ...m, ...message }
                : m
            ),
          },
        };
      }
      return { messages: { ...s.messages, [convId]: [...list, message] } };
    }),
  updateMessage: (convId, messageId, partial) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] || []).map((m) =>
          m.id === messageId ? { ...m, ...partial } : m
        ),
      },
    })),
  setTyping: (convId, list) =>
    set((s) => ({ typing: { ...s.typing, [convId]: list } })),
  setUnread: (convId, count) =>
    set((s) => ({ unread: { ...s.unread, [convId]: count } })),
  incrementUnread: (convId) =>
    set((s) => ({
      unread: { ...s.unread, [convId]: (s.unread[convId] || 0) + 1 },
    })),
}));

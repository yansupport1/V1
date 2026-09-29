import { create } from 'zustand';
import type { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  updateProfile: (partial) =>
    set((s) => (s.user ? { user: { ...s.user, ...partial } } : s)),
}));

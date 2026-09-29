import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeId, ColorMode } from '../types';

interface ThemeState {
  theme: ThemeId;
  colorMode: ColorMode;
  setTheme: (t: ThemeId) => void;
  setColorMode: (m: ColorMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      colorMode: 'system',
      setTheme: (theme) => set({ theme }),
      setColorMode: (colorMode) => set({ colorMode }),
    }),
    { name: 'yessapp-theme' }
  )
);

export const THEME_META: Record<
  ThemeId,
  { name: string; description: string; accent: string }
> = {
  glassmorph: {
    name: 'Glassmorph',
    description: 'Transparan modern dengan blur & floating cards',
    accent: '#6366f1',
  },
  default: {
    name: 'Default',
    description: 'Clean minimal seperti messenger modern',
    accent: '#25d366',
  },
  'soft-red': {
    name: 'Soft Red',
    description: 'Aksen merah lembut, gradient halus',
    accent: '#e87070',
  },
  'soft-cyan': {
    name: 'Soft Cyan',
    description: 'Cyan futuristik, clean & subtle glow',
    accent: '#22d3ee',
  },
  'soft-green': {
    name: 'Soft Green',
    description: 'Hijau natural nyaman untuk lama',
    accent: '#4ade80',
  },
};

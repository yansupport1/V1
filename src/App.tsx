import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import {
  subscribeAuth,
  fetchUserProfile,
  setupPresence,
} from './services/authService';
import { AuthPage } from './pages/AuthPage';
import { AppShell } from './components/layout/AppShell';
import { ChatsPage } from './pages/ChatsPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { StatusPage } from './pages/StatusPage';
import { CallsPage } from './pages/CallsPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppearancePage } from './pages/AppearancePage';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const colorMode = useThemeStore((s) => s.colorMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    const applyDark = (dark: boolean) => {
      root.classList.toggle('dark', dark);
    };

    if (colorMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    applyDark(colorMode === 'dark');
  }, [theme, colorMode]);

  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = subscribeAuth(async (fbUser) => {
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser.uid);
        if (profile) {
          setUser(profile);
          setupPresence(profile.uid);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ChatsPage />} />
              <Route path="status" element={<StatusPage />} />
              <Route path="communities" element={<CommunitiesPage />} />
              <Route path="calls" element={<CallsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings/appearance" element={<AppearancePage />} />
            </Route>
            <Route path="chat/:convId" element={<ChatRoomPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </ThemeProvider>
  );
}

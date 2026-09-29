import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

const hideNavPaths = ['/chat/'];

export function AppShell() {
  const { pathname } = useLocation();
  const hideNav = hideNavPaths.some((p) => pathname.startsWith(p));

  return (
    <div className="h-full max-h-[100dvh] flex flex-col max-w-lg mx-auto relative bg-[var(--color-bg)] overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

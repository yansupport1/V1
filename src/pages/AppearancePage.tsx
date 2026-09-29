import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, THEME_META } from '../stores/themeStore';
import type { ThemeId, ColorMode } from '../types';
import { cn } from '../lib/utils';

const themes = Object.entries(THEME_META) as [ThemeId, (typeof THEME_META)[ThemeId]][];

export function AppearancePage() {
  const navigate = useNavigate();
  const { theme, colorMode, setTheme, setColorMode } = useThemeStore();

  const modes: { id: ColorMode; icon: typeof Sun; label: string }[] = [
    { id: 'light', icon: Sun, label: 'Terang' },
    { id: 'dark', icon: Moon, label: 'Gelap' },
    { id: 'system', icon: Monitor, label: 'Sistem' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <header className="safe-top glass sticky top-0 z-10 flex items-center gap-2 px-2 h-14 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-lg">Tampilan</h1>
      </header>

      <section className="px-4 py-5">
        <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
          Mode warna
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setColorMode(id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border transition',
                colorMode === id
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              <Icon className={cn('h-5 w-5', colorMode === id && 'text-accent')} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 py-2 pb-10">
        <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
          Tema
        </h2>
        <div className="space-y-2">
          {themes.map(([id, meta]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left',
                theme === id
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              <div
                className="h-10 w-10 rounded-xl shrink-0 shadow-soft"
                style={{ background: meta.accent }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{meta.name}</p>
                <p className="text-xs text-muted mt-0.5">{meta.description}</p>
              </div>
              {theme === id && <Check className="h-5 w-5 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

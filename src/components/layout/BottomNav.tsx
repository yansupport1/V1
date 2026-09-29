import { NavLink } from 'react-router-dom';
import { MessageSquare, CircleDot, Phone, Users, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const tabs = [
  { to: '/', icon: MessageSquare, label: 'Chat' },
  { to: '/status', icon: CircleDot, label: 'Status' },
  { to: '/communities', icon: Users, label: 'Komunitas' },
  { to: '/calls', icon: Phone, label: 'Panggilan' },
  { to: '/profile', icon: User, label: 'Profil' },
];

export function BottomNav() {
  return (
    <nav className="glass-nav safe-bottom shrink-0">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-full text-[11px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-muted hover:text-[var(--color-text)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('h-5.5 w-5.5', isActive && 'stroke-[2.4]')}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white bg-accent',
            sizes[size]
          )}
        >
          {getInitials(name || '?')}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface',
            online ? 'bg-emerald-500' : 'bg-gray-400',
            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}
        />
      )}
    </div>
  );
}

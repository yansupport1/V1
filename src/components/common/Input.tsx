import { cn } from '../../lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full h-12 px-4 rounded-xl bg-surface-2 border border-border',
          'text-[var(--color-text)] placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent',
          'transition-shadow',
          error && 'border-red-400 focus:ring-red-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

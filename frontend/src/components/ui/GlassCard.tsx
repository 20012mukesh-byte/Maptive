import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/40 bg-white/30 shadow-glass backdrop-blur-2xl',
        className
      )}
      {...props}
    />
  );
}

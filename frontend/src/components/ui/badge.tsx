import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border-0.5 px-2 py-0.5 text-xs font-normal transition-colors',
        {
          'bg-primary/10 text-primary border-primary/20': variant === 'default',
          'bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border-[hsl(var(--success))]/20': variant === 'success',
          'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20': variant === 'warning',
          'bg-[hsl(var(--error-bg))] text-[hsl(var(--error))] border-[hsl(var(--error))]/20': variant === 'error',
          'bg-[hsl(var(--info-bg))] text-[hsl(var(--info))] border-[hsl(var(--info))]/20': variant === 'info',
          'bg-secondary text-secondary-foreground border-border': variant === 'secondary',
          'text-foreground border-border bg-transparent': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };

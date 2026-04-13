'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 bg-bg-tertiary border border-border rounded-full text-xs font-medium text-text-secondary uppercase tracking-wider',
          className
        )}
        {...props}
      >
        {dot && (
          <span className="w-2 h-2 rounded-full bg-accent animate-[pulse-glow_2s_ease-in-out_infinite] shadow-[0_0_10px_var(--color-accent)]" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

// src/components/PlanBadge.tsx
"use client";

import type React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PlanBadgeSize = 'xs' | 'sm';

interface PlanBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  plan: 'Free' | 'PRO' | 'Business' | 'Enterprise';
  size?: PlanBadgeSize;
  icon?: React.ReactNode;
}

const planStyles: Record<PlanBadgeProps['plan'], string> = {
  Free: 'border-muted-foreground/30 text-muted-foreground bg-muted/40',
  PRO: 'border-border text-foreground bg-background',
  Business: 'border-border text-foreground bg-background',
  Enterprise: 'border-border text-foreground bg-background',
};

const sizeStyles: Record<PlanBadgeSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
};

export function PlanBadge({ plan, size = 'sm', icon, className, ...props }: PlanBadgeProps) {
  const isClickable = typeof props.onClick === 'function';
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onClick?.(event as any);
    }
  };
  return (
    <Badge
      variant="outline"
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 uppercase tracking-wide',
        planStyles[plan],
        sizeStyles[size],
        isClickable && 'cursor-pointer transition-colors hover:opacity-90',
        className,
      )}
      {...props}
    >
      {icon}
      {plan}
    </Badge>
  );
}

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
  PRO: 'border-amber-300 text-amber-700 bg-amber-50',
  Business: 'border-sky-300 text-sky-700 bg-sky-50',
  Enterprise: 'border-emerald-300 text-emerald-700 bg-emerald-50',
};

const sizeStyles: Record<PlanBadgeSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
};

export function PlanBadge({ plan, size = 'sm', icon, className, ...props }: PlanBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1 uppercase tracking-wide', planStyles[plan], sizeStyles[size], className)}
      {...props}
    >
      {icon}
      {plan}
    </Badge>
  );
}

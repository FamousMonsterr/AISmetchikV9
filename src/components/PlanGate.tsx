// src/components/PlanGate.tsx
"use client";

import type React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlanBadge } from '@/components/PlanBadge';

interface PlanGateProps {
  locked: boolean;
  plan?: 'Free' | 'PRO' | 'Business' | 'Enterprise';
  requestLabel?: string;
  onRequest?: () => void;
  children: React.ReactNode;
  className?: string;
  mode?: 'button' | 'badge';
}

export function PlanGate({ locked, plan = 'Business', requestLabel, onRequest, children, className, mode = 'button' }: PlanGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className={cn('relative rounded-md', className)}>
      <div className="pointer-events-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-end pr-2">
        {mode === 'badge' ? (
          <div className="pointer-events-none">
            <PlanBadge plan={plan} size="xs" />
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={onRequest}>
            {requestLabel || 'Запросить доступ'}
            <PlanBadge plan={plan} size="xs" className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

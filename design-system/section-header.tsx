'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './badge';

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ label, title, subtitle, className, align = 'center' }, ref) => {
    const alignStyles = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <div ref={ref} className={cn('mb-16', alignStyles[align], className)}>
        {label && (
          <Badge className="mb-4">{label}</Badge>
        )}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{title}</h2>
        {subtitle && (
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">{subtitle}</p>
        )}
      </div>
    );
  }
);

SectionHeader.displayName = 'SectionHeader';

export { SectionHeader };

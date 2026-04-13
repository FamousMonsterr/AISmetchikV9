'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'sd' | 'hd' | 'fullhd' | '4k';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover hover:-translate-y-0.5',
      secondary: 'bg-bg-elevated text-text-primary border border-border hover:bg-bg-tertiary hover:border-border-hover hover:-translate-y-0.5',
      sd: 'bg-sd text-white hover:opacity-90 hover:-translate-y-0.5',
      hd: 'bg-hd text-white hover:opacity-90 hover:-translate-y-0.5',
      fullhd: 'bg-fullhd text-white hover:opacity-90 hover:-translate-y-0.5',
      '4k': 'bg-4k text-bg-primary hover:opacity-90 hover:-translate-y-0.5',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

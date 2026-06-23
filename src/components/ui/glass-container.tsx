"use client";

import React, { ReactNode } from 'react';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
  blur?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onClick?: () => void;
}

export const GlassContainer = ({
  children,
  className,
  variant = 'light',
  blur = 'lg',
  animate = false,
  onClick,
}: GlassContainerProps) => {
  const blurMap = {
    xs: 'backdrop-blur-xs',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const variantClasses = {
    light: 'bg-foreground/10 border-foreground/20',
    dark: 'bg-foreground/10 border-foreground/10',
  };

  return (
    <motion.div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'glass-effect relative rounded-3xl border backdrop-blur-lg p-6 transition-all duration-300',
        blurMap[blur],
        variantClasses[variant],
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      onClick={onClick}
      initial={animate ? { opacity: 0, scale: 0.95 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      whileHover={animate ? { scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' } : undefined}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};


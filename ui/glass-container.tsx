"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
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
    light: 'bg-white/10 border-white/20',
    dark: 'bg-black/10 border-white/10',
  };

  return (
    <motion.div
      className={cn(
        'glass-effect relative rounded-3xl border backdrop-blur-lg p-6 transition-all duration-300',
        blurMap[blur],
        variantClasses[variant],
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

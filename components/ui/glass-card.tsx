"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  interactive?: boolean;
  gradient?: 'blue' | 'purple' | 'pink' | 'none';
}

export const GlassCard = ({
  children,
  title,
  description,
  icon,
  className,
  interactive = true,
  gradient = 'none',
}: GlassCardProps) => {
  const gradientClasses = {
    blue: 'dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-blue-600/10',
    purple: 'dark:bg-gradient-to-br dark:from-purple-500/20 dark:to-purple-600/10',
    pink: 'dark:bg-gradient-to-br dark:from-pink-500/20 dark:to-pink-600/10',
    none: 'bg-card/60 dark:bg-card/30',
  };

  const whileHover = interactive
    ? { y: -5, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }
    : undefined;

  return (
    <motion.div
      className={cn(
        'glass-effect group relative rounded-2xl border p-6 backdrop-blur-xl',
        'border-black/5 dark:border-white/10',
        gradientClasses[gradient],
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={whileHover}
      transition={{ duration: 0.3 }}
    >
      {/* Overlay for hover effect, doesn't capture clicks */}
      {interactive && <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
       {interactive && <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 animate-shimmer pointer-events-none" />}


      {/* Заголовок с иконкой */}
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-4">
          {icon && <div className="text-2xl">{icon}</div>}
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
        </div>
      )}

      {/* Описание */}
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}

      {/* Контент */}
      <div className="text-muted-foreground">{children}</div>

    </motion.div>
  );
};

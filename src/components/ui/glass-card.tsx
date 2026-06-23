"use client";

import React, { ReactNode } from 'react';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  interactive?: boolean;
}

export const GlassCard = ({
  children,
  title,
  description,
  icon,
  className,
  interactive = true,
}: GlassCardProps) => {
  const whileHover = interactive
    ? { y: -5, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }
    : undefined;

  return (
    <motion.div
      className={cn(
        'glass-effect group relative rounded-2xl border p-6 backdrop-blur-xl',
        'border-black/5 dark:border-white/10',
        'bg-card/60 dark:bg-card/30',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={whileHover}
      transition={{ duration: 0.3 }}
    >
      {interactive && (
        <div className="absolute inset-0 rounded-2xl bg-foreground/[0.03] opacity-0 transition-opacity pointer-events-none group-hover:opacity-100" />
      )}


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


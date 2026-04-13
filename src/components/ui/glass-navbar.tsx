
"use client";

import React, { ReactNode } from 'react';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
}

interface GlassNavbarProps {
  logo?: ReactNode;
  items: NavItem[];
  actions?: ReactNode;
  variant?: 'static' | 'floating';
  className?: string;
  children?: ReactNode; // Allow children to be passed
}

export const GlassNavbar = ({
  logo,
  items,
  actions,
  variant = 'floating',
  className,
  children
}: GlassNavbarProps) => {
  const containerVariants = {
    static: 'w-full rounded-none',
    floating: 'w-full rounded-none',
  };

  return (
    <motion.nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/96 shadow-sm',
        containerVariants[variant],
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-2">
        {/* Логотип */}
        {logo && (
          <motion.div
            className="flex-shrink-0 font-bold text-xl text-foreground"
            whileHover={{ scale: 1.05 }}
          >
            {logo}
          </motion.div>
        )}

        {/* Навигационные ссылки (теперь через children) */}
        {children}

        {/* Действия справа */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </motion.nav>
  );
};


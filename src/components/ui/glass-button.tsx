// @ts-nocheck
"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  'relative flex items-center justify-center gap-2 rounded-full border backdrop-blur-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] active:brightness-95',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'glass-effect bg-card/60 dark:bg-card/30 hover:bg-secondary border-border text-foreground',
        danger: 'glass-effect bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-100',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-2.5 text-base',
        lg: 'px-8 py-3.5 text-lg',
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  icon?: ReactNode;
}


export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, onClick, variant, size, disabled = false, className, ...props }, ref) => {
    
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={onClick}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.03 } : undefined}
        whileTap={!disabled ? { scale: 0.98, opacity: 0.9 } : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {props.icon}
        {children}
      </motion.button>
    );
  }
);

GlassButton.displayName = "GlassButton";

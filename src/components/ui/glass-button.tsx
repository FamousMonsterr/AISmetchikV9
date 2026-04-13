// @ts-nocheck
"use client";

import React, { ReactNode } from 'react';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  'relative flex items-center justify-center gap-2 rounded-full border transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] active:brightness-95',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-card hover:bg-secondary border-border text-foreground shadow-sm',
        danger: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200',
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


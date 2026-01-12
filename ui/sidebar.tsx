"use client";

import React, { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SidebarContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAnimating: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  className,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen, isAnimating }}>
      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
            <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30 md:hidden"
                onClick={() => setOpen(false)}
            />
            <motion.div
                 initial={{ x: "-100%" }}
                 animate={{ x: 0 }}
                 exit={{ x: "-100%" }}
                 transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                 }}
                className={cn(
                    "glass-effect fixed top-0 left-0 h-full w-64 bg-background/80 dark:bg-neutral-900/80 border-r border-white/10 z-50 md:hidden",
                    className,
                )}
            >
                {children}
            </motion.div>
            </>
        )}
      </AnimatePresence>


      {/* Desktop sidebar */}
      <motion.nav
        initial={false}
        animate={{
          width: open ? "16rem" : "5rem",
        }}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={() => setIsAnimating(false)}
        transition={{
          duration: 0.2,
          ease: "easeInOut",
        }}
        className={cn(
          "hidden md:flex flex-col justify-between h-screen sticky top-0",
          className,
        )}
      >
        {children}
      </motion.nav>
    </SidebarContext.Provider>
  );
};

export const SidebarBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-1 flex-col h-full overflow-y-auto", className)}>
      {children}
    </div>
  );
};

interface Link {
  label: string;
  href: string;
  icon: React.ReactNode;
  action?: () => void;
  active?: boolean; // Add active prop
  notificationCount?: number;
}

export const SidebarLink = ({
  link,
  className,
  onNavigate,
}: {
  link: Link;
  className?: string;
  onNavigate?: () => void;
}) => {
  const { open, isAnimating } = useSidebar();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate();
    }
  }

  return (
    <Link
      href={link.href}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 rounded-lg transition-colors duration-200 relative",
        link.active ? "bg-primary/90 text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
        open ? "px-3" : "px-4 justify-center",
        className
      )}
    >
      {link.icon}
      {link.notificationCount && link.notificationCount > 0 && (
         <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold",
            open ? "top-1.5 right-1.5" : "top-0.5 right-0.5"
          )}
        >
          {link.notificationCount > 9 ? '9+' : link.notificationCount}
        </motion.div>
      )}
      <AnimatePresence>
        {open && !isAnimating && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.1, delay: 0.1 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
};

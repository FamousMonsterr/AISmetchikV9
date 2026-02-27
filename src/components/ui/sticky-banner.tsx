// src/components/ui/sticky-banner.tsx
"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const StickyBanner = ({
  children,
  className,
  storageKey,
  isVisible: externalIsVisible, // Optional prop to control visibility externally
}: {
  children: React.ReactNode;
  className?: string;
  storageKey?: string; // Optional: if not provided, banner is always visible unless controlled externally
  isVisible?: boolean;
}) => {
  // Internal state for dismissal when storageKey is used
  const [isDismissed, setIsDismissed] = useState(true); // Default to dismissed until checked

  useEffect(() => {
    // This effect runs only on the client-side
    if (storageKey) {
      try {
        const closed = localStorage.getItem(storageKey);
        // Only set to false if it's explicitly not "true".
        // This handles null/undefined cases gracefully.
        if (closed !== "true") {
          setIsDismissed(false);
        }
      } catch (error) {
         console.error("Could not access localStorage for banner:", error);
         // If localStorage is unavailable, maybe default to showing it
         setIsDismissed(false);
      }
    } else {
        // If no storage key, it's controlled externally or always visible
        setIsDismissed(false);
    }
  }, [storageKey]);

  const handleClose = () => {
    setIsDismissed(true);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch (error) {
        console.error("Could not write to localStorage for banner:", error);
      }
    }
  };
  
  // Determine final visibility
  const isVisible = externalIsVisible !== undefined
    ? externalIsVisible // Controlled by prop if provided
    : !isDismissed; // Controlled by internal state

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "relative z-[60] flex items-center justify-center px-3 py-2 text-sm font-medium",
            "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white", // Example gradient
            className
          )}
        >
          <div className="relative flex w-full flex-col flex-wrap items-center justify-center gap-2 text-center sm:flex-row sm:text-left pr-10">
            {children}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute right-2 top-2 h-6 w-6 rounded-full text-current hover:bg-black/20"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close banner</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

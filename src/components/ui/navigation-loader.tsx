"use client";

import { AnimatePresence, motion } from "@/lib/motion";
import { Loader2 } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export function NavigationLoader({ className }: { className?: string } = {}) {
  const { isNavigating } = useAppContext();

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur-sm",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-5 py-4 shadow-xl"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-sm font-medium">Загрузка…</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


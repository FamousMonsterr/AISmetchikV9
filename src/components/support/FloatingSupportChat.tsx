// src/components/support/FloatingSupportChat.tsx
"use client";

import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { SupportChat } from '@/components/support/SupportChat';
import { cn } from '@/lib/utils';
import { useSupportChat } from '@/contexts/SupportChatContext';

export function FloatingSupportChat() {
  const { isOpen, toggle } = useSupportChat();

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-[92vw] sm:w-[360px] max-w-[92vw] h-[60vh] sm:h-[520px] max-h-[70vh]">
          <SupportChat className="shadow-xl" />
        </div>
      )}
      <Button
        size="icon"
        className={cn(
          "h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg",
          isOpen ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={toggle}
        aria-label={isOpen ? 'Свернуть чат' : 'Открыть чат'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}

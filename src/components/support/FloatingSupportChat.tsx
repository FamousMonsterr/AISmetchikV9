// src/components/support/FloatingSupportChat.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { SupportChat } from '@/components/support/SupportChat';
import { cn } from '@/lib/utils';

export function FloatingSupportChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-[360px] max-w-[90vw] h-[520px] max-h-[70vh]">
          <SupportChat className="shadow-xl" />
        </div>
      )}
      <Button
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full shadow-lg",
          isOpen ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Свернуть чат' : 'Открыть чат'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}

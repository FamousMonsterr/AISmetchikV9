"use client";

import { useEffect, useId, useRef } from 'react';

declare global {
  interface Window {
    [key: string]: any;
  }
}

type TelegramAuthWidgetProps = {
  botUsername: string;
  onAuth: (payload: Record<string, unknown>) => void | Promise<void>;
  size?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestWriteAccess?: boolean;
  className?: string;
};

export function TelegramAuthWidget({
  botUsername,
  onAuth,
  size = 'medium',
  cornerRadius = 10,
  requestWriteAccess = false,
  className,
}: TelegramAuthWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackId = useId().replace(/[:]/g, '');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) {
      return;
    }

    const callbackName = `__telegramAuthCb_${callbackId}`;
    window[callbackName] = (user: Record<string, unknown>) => {
      void onAuth(user);
    };

    container.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', size);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', requestWriteAccess ? 'write' : 'read');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    container.appendChild(script);

    return () => {
      delete window[callbackName];
      container.innerHTML = '';
    };
  }, [botUsername, callbackId, cornerRadius, onAuth, requestWriteAccess, size]);

  return <div ref={containerRef} className={className} />;
}

// src/hooks/use-engagement-tracking.ts
"use client";

import { useEffect, useCallback } from "react";

const sendEvent = async (type: "pwa_install" | "tg_open", userId: string) => {
  try {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "addDoc",
        ref: { name: "engagement_events" },
        data: {
          userId,
          type,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          createdAt: new Date().toISOString(),
        },
      }),
    });
  } catch (e) {
    console.error("engagement event failed", e);
  }
};

export const useEngagementTracking = (userId?: string | null) => {
  const logOnce = useCallback(
    (key: string, type: "pwa_install" | "tg_open") => {
      if (!userId) return;
      const storageKey = `eng-${key}`;
      if (typeof window === "undefined") return;
      if (localStorage.getItem(storageKey) === "1") return;
      localStorage.setItem(storageKey, "1");
      void sendEvent(type, userId);
    },
    [userId]
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const handleInstalled = () => logOnce("pwa-install", "pwa_install");
    window.addEventListener("appinstalled", handleInstalled);

    // Если уже в standalone — тоже логируем один раз
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone;
    if (isStandalone) {
      logOnce("pwa-installed-standalone", "pwa_install");
    }

    // Telegram mini-app: логируем открытие
    if ((window as any).Telegram?.WebApp?.initData) {
      logOnce("tg-open", "tg_open");
    }

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [logOnce, userId]);
};

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const COOKIE_CONSENT_KEY = "cookieConsent";

type Preferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp?: number;
};

export function CookieConsentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    necessary: true,
    analytics: true,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    try {
      const storedConsent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!storedConsent) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  }, []);

  const saveConsent = (prefs: Preferences) => {
    const consentData = { ...prefs, timestamp: Date.now() };
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    setIsOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true, functional: true });
  };

  const handleRejectAll = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false, functional: false });
  };

  const handleSaveSettings = () => {
    saveConsent(preferences);
  };

  const handleTogglePreference = (key: keyof Omit<Preferences, "necessary" | "timestamp">) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 shadow-lg">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Cookie className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Настройки cookie</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Используем cookie для стабильной работы, аналитики и сервисных сценариев. Подробности в
              <Link href="/legal/privacy-policy" className="ml-1 underline underline-offset-4 hover:text-foreground">
                политике обработки данных
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <Button onClick={handleAcceptAll}>Принять все</Button>
            <Button variant="outline" onClick={() => setShowSettings((prev) => !prev)}>
              {showSettings ? "Скрыть настройки" : "Настроить"}
            </Button>
            <Button variant="ghost" onClick={handleRejectAll}>
              Только необходимые
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="necessary" className="font-medium">Необходимые</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Нужны для базовой работы сайта.</p>
                </div>
                <Checkbox id="necessary" checked disabled />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics" className="font-medium">Аналитика</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Помогает улучшать интерфейсы и сценарии.</p>
                </div>
                <Switch id="analytics" checked={preferences.analytics} onCheckedChange={() => handleTogglePreference("analytics")} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing" className="font-medium">Маркетинг</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Нужен для персонализированных рассылок и кампаний.</p>
                </div>
                <Switch id="marketing" checked={preferences.marketing} onCheckedChange={() => handleTogglePreference("marketing")} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="functional" className="font-medium">Функциональные</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Включают дополнительные удобства и сохранение предпочтений.</p>
                </div>
                <Switch id="functional" checked={preferences.functional} onCheckedChange={() => handleTogglePreference("functional")} />
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <Button onClick={handleSaveSettings}>Сохранить настройки</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

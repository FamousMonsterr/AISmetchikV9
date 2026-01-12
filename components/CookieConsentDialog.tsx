// src/components/CookieConsentDialog.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Cookie } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'cookieConsent';

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
        // This code only runs on the client
        try {
            const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (!storedConsent) {
                setIsOpen(true);
            } else {
                 // You might want to apply the stored preferences here
                const parsedConsent = JSON.parse(storedConsent);
                // Example: if (!parsedConsent.analytics) { disableAnalytics(); }
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
        }
    }, []);

    const saveConsent = (prefs: Preferences) => {
        const consentData = { ...prefs, timestamp: Date.now() };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
        setIsOpen(false);
        // Here you would trigger the services based on the preferences
        console.log("Consent saved:", consentData);
    };

    const handleAcceptAll = () => {
        const allAccepted: Preferences = { necessary: true, analytics: true, marketing: true, functional: true };
        saveConsent(allAccepted);
    };
    
    const handleRejectAll = () => {
        const onlyNecessary: Preferences = { necessary: true, analytics: false, marketing: false, functional: false };
        saveConsent(onlyNecessary);
    };

    const handleSaveSettings = () => {
        saveConsent(preferences);
    };
    
    const handleTogglePreference = (key: keyof Omit<Preferences, 'necessary' | 'timestamp'>) => {
        setPreferences(prev => ({...prev, [key]: !prev[key]}));
    };
    

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:left-4 sm:bottom-4 sm:right-auto"
            >
                <Dialog open={true}>
                    <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Cookie className="text-primary"/>
                                Мы используем файлы cookie
                            </DialogTitle>
                            <DialogDescription>
                                Мы используем cookie для улучшения работы сайта, анализа трафика и персонализации.
                                <Link href="/legal/privacy-policy" className="underline ml-1">Подробнее</Link>
                            </DialogDescription>
                        </DialogHeader>

                        <AnimatePresence mode="wait">
                            {!showSettings ? (
                                <motion.div
                                    key="main"
                                    exit={{ opacity: 0, x: -50 }}
                                    className="flex flex-col space-y-2 pt-4"
                                >
                                    <Button onClick={handleAcceptAll}>Принять все</Button>
                                    <Button variant="secondary" onClick={() => setShowSettings(true)}>Настроить</Button>
                                    <Button variant="ghost" onClick={handleRejectAll}>Отклонить необязательные</Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-3 pt-4 border-t"
                                >
                                    <h4 className="font-semibold">Настройки cookie</h4>
                                    
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <div>
                                            <Label htmlFor="necessary" className="font-medium">Необходимые</Label>
                                            <p className="text-xs text-muted-foreground">Требуются для работы сайта</p>
                                        </div>
                                        <Checkbox id="necessary" checked disabled />
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <div>
                                            <Label htmlFor="analytics" className="font-medium">Аналитика</Label>
                                            <p className="text-xs text-muted-foreground">Помогают улучшить сайт</p>
                                        </div>
                                        <Switch id="analytics" checked={preferences.analytics} onCheckedChange={() => handleTogglePreference('analytics')} />
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <div>
                                            <Label htmlFor="marketing" className="font-medium">Маркетинг</Label>
                                            <p className="text-xs text-muted-foreground">Персонализированная реклама</p>
                                        </div>
                                        <Switch id="marketing" checked={preferences.marketing} onCheckedChange={() => handleTogglePreference('marketing')} />
                                    </div>
                                     <div className="flex items-center justify-between py-2">
                                        <div>
                                            <Label htmlFor="functional" className="font-medium">Функциональные</Label>
                                            <p className="text-xs text-muted-foreground">Дополнительные возможности</p>
                                        </div>
                                        <Switch id="functional" checked={preferences.functional} onCheckedChange={() => handleTogglePreference('functional')} />
                                    </div>
                                    
                                     <DialogFooter className="pt-4 flex !justify-between">
                                        <Button variant="secondary" onClick={() => setShowSettings(false)}>Отмена</Button>
                                        <Button onClick={handleSaveSettings}>Сохранить</Button>
                                    </DialogFooter>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AnimatePresence>
    );
}
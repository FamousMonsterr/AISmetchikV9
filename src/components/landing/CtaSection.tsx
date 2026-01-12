"use client";

import { useState } from 'react';
import { CtaButton } from "./CtaButton";
import { GlassCard } from "../ui/glass-card";
import { RegistrationDialog } from '@/components/RegistrationDialog';

export const CtaSection = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <>
        <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        <section className="py-20">
            <div className="container mx-auto">
                <GlassCard gradient="blue" className="text-center p-8">
                    <h2 className="text-3xl font-bold text-foreground">Начните экономить время уже сегодня!</h2>
                    <p className="mt-2 text-muted-foreground">Присоединяйтесь к тысячам сметчиков, которые уже автоматизировали свою работу</p>
                    <div className="mt-8 flex flex-col items-center">
                        <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="primary" size="lg">
                            ЗАРЕГИСТРИРОВАТЬСЯ БЕСПЛАТНО
                        </CtaButton>
                        <p className="mt-2 text-sm text-muted-foreground">Без привязки карты • Начните работать через 30 секунд</p>
                    </div>
                </GlassCard>
            </div>
        </section>
        </>
    );
};

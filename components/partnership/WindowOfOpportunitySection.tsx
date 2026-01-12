"use client";
import React from 'react';
import { motion } from "framer-motion";
import { GlassCard } from '@/components/ui/glass-card';
import { Zap } from 'lucide-react';
import { CtaButton } from "@/components/landing/CtaButton";
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';

export const WindowOfOpportunitySection = () => {
    const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = React.useState(false);

    return (
        <>
            <LegalEntityRegistrationDialog isOpen={isPartnerRegisterOpen} onClose={() => setIsPartnerRegisterOpen(false)} isPartnerRegistration={true} />
            <section className="py-20">
                <div className="container mx-auto">
                    <GlassCard gradient="blue" className="text-center">
                        <div className="max-w-3xl mx-auto">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, type: 'spring' }}
                                className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-6"
                            >
                                <Zap className="h-10 w-10 text-primary" />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-foreground">Почему сейчас — лучшее время?</h2>
                            <p className="text-lg text-muted-foreground mt-4">
                                Рынок слаботочных систем находится на пороге цифровой революции. Старые методы работы уходят в прошлое, а спрос на автоматизацию и эффективность растет с каждым днем.
                            </p>
                            <p className="mt-4 text-2xl font-bold text-foreground bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Вы можете стать лидером этой трансформации в своем регионе.
                            </p>
                             <p className="text-muted-foreground mt-4">
                                Став партнером AI Сметчик сегодня, вы получаете уникальное преимущество первопроходца на рынке, который ежегодно растет на 37%. Не упустите шанс занять свою нишу, пока это не сделали другие.
                            </p>
                            <div className="mt-8">
                                <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)} variant="primary" size="lg">
                                    Войти в рынок сейчас
                                </CtaButton>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </section>
        </>
    );
};

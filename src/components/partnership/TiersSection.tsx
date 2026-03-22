"use client";
import React, { useState } from 'react';
import { motion } from "@/lib/motion";
import { CtaButton } from "@/components/landing/CtaButton";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Star, Trophy, Crown, Gem } from 'lucide-react';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';

export const TiersSection = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const levels = [
        {
            name: 'Bronze',
            icon: Star,
            title: 'Бронзовый партнер',
            reward: '100%* с первой оплаты',
            oldReward: '50%',
            condition: 'Присваивается автоматически после регистрации в партнерской программе.',
            suits: 'Подходит для: Физ. лиц',
            color: 'text-amber-600 border-amber-400',
            cta: 'Начать зарабатывать',
        },
        {
            name: 'Silver',
            icon: Trophy,
            title: 'Серебряный партнер',
            reward: '10%* от всех платежей',
            oldReward: '5%',
            condition: 'Требуется пройти обучение.',
            suits: 'Подходит для: Физ. лиц и самозанятых',
            color: 'text-slate-500 border-slate-400',
            cta: 'Оставить заявку',
        },
        {
            name: 'Gold',
            icon: Crown,
            title: 'Золотой партнер',
            reward: '40%* от всех платежей',
            oldReward: '25%',
            price: '500 000 ₽*',
            oldPrice: '2 000 000 ₽',
            condition: 'Заключение договора франшизы, паушальный взнос.',
            suits: 'Подходит для: Самозанятых, ИП и ООО',
            color: 'text-yellow-500 border-yellow-400',
            cta: 'Оставить заявку',
        },
        {
            name: 'Platinum',
            icon: Gem,
            title: 'Платиновый партнер',
            reward: '60%* + White Label',
            oldReward: '40%',
            price: '1 500 000 ₽*',
            oldPrice: '6 000 000 ₽',
            condition: 'Эксклюзивные условия, взнос.',
            suits: 'Подходит для: ИП и ООО',
            color: 'text-sky-500 border-sky-400',
            cta: 'Оставить заявку',
        },
    ];
    
    return (
        <>
        <LegalEntityRegistrationDialog 
            isOpen={isRegisterOpen} 
            onClose={() => setIsRegisterOpen(false)} 
            isPartnerRegistration={true}
        />
        <section id="apply" className="py-20">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground">Выберите свой путь</h2>
                    <p className="text-muted-foreground mt-2">Начните с простого и дойдите до эксклюзивного представителя в своем регионе.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    {levels.map((level) => (
                        <GlassCard key={level.name} className="flex flex-col">
                            <div className="flex-grow">
                                <CardHeader className="p-0 mb-4">
                                    <h3 className={cn("text-xl font-bold flex items-center gap-2", level.color)}>
                                        <level.icon className="h-5 w-5" />
                                        {level.title}
                                    </h3>
                                </CardHeader>
                                <CardContent className="p-0">
                                <div className="space-y-4 text-sm">
                                    <div>
                                        {level.oldReward && <span className="text-muted-foreground line-through text-lg">{level.oldReward}</span>}
                                        <div className="text-2xl font-bold">{level.reward}</div>
                                    </div>

                                    {level.price && (
                                        <div>
                                            {level.oldPrice && <p className="text-sm text-muted-foreground line-through">{level.oldPrice}</p>}
                                            <p className="text-2xl font-bold text-primary">{level.price}</p>
                                        </div>
                                    )}
                                    <p className="text-muted-foreground min-h-[3rem]">{level.condition}</p>
                                    <p className="text-xs font-semibold">{level.suits}</p>
                                </div>
                                </CardContent>
                            </div>
                            <div className="mt-auto pt-6">
                                <CtaButton href="#" onClick={(e) => { e.preventDefault(); setIsRegisterOpen(true); }} variant="primary" className="w-full">
                                    {level.cta}
                                </CtaButton>
                            </div>
                        </GlassCard>
                    ))}
                </div>
                 <div className="text-center mt-8 text-sm text-muted-foreground">
                    <p>* эти условия действуют до 1 января 2026 года, акция направлена на стимулирование роста подписчиков и партнеров.</p>
                </div>
            </div>
        </section>
        </>
    );
};


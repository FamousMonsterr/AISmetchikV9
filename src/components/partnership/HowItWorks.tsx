"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from '@/components/ui/glass-card';
import { Briefcase, Megaphone, Database, ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const steps = [
    { 
        title: "Менеджер + Своя Компания", 
        description: "Зарегистрируйте свою компанию как партнера по своей же реферальной ссылке. Теперь все платежи вашей компании будут приносить вам легальный пассивный доход.", 
        icon: Briefcase,
        details: "Это самый популярный и этичный кейс. Вы приносите пользу своей компании, автоматизируя ее работу, и одновременно получаете ежемесячное вознаграждение на свой личный счет. Абсолютно легально и прозрачно."
    },
    { 
        title: "Блогеры и Лидеры мнений", 
        description: "Разместите реферальную ссылку в описании под видео, в статьях или в ваших Telegram-каналах.", 
        icon: Megaphone,
        details: "Ваша аудитория доверяет вашему мнению. Поделитесь с ними инструментом, который экономит время, и получайте процент с каждой их покупки кредитов или подписки. Ваш доход растет вместе с вашей аудиторией."
    },
    { 
        title: "Интеграторы и IT-компании", 
        description: "Зарабатывайте на внедрении нашего сервиса в бизнес-процессы ваших клиентов.", 
        icon: Database,
        details: "Предлагайте 'AI Сметчик' как часть комплексной автоматизации для ваших клиентов. Вы не только получаете процент от их платежей, но и можете оказывать платные услуги по настройке интеграции с их CRM (AmoCRM, Битрикс24, 1С)."
    },
    { 
        title: "Агенты и консультанты", 
        description: "Расширьте спектр своих услуг, предлагая клиентам современный инструмент для автоматизации смет.", 
        icon: Users,
        details: "Если у вас есть наработанная база клиентов (например, по продаже лицензий МЧС или допусков СРО), предложите им наш сервис. Это идеальное дополнение к вашим услугам, которое приносит стабильный доход."
    }
];

const IncomeSourceCard = ({ step, isOpen, onToggle }: { step: typeof steps[0], isOpen: boolean, onToggle: () => void }) => {
    return (
        <GlassCard className="text-left h-full flex flex-col">
            <div className="flex-grow">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full w-fit">
                        <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                        <p className="text-muted-foreground mt-1">{step.description}</p>
                    </div>
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-4"
                        >
                            <div className="pl-14 text-sm border-l-2 border-primary/20 ml-5">
                               <p className="pl-4 text-primary-foreground/80">{step.details}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
             <div className="mt-4 pl-14">
                <Button variant="link" onClick={onToggle} className="p-0 h-auto text-sm">
                    {isOpen ? 'Скрыть' : 'Подробнее'}
                    <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
            </div>
        </GlassCard>
    );
};

export const HowItWorks = () => {
    const [openCard, setOpenCard] = useState<string | null>(null);

    const handleToggle = (title: string) => {
        setOpenCard(prev => (prev === title ? null : title));
    };

    return (
        <section className="py-20" id="how-it-works">
            <div className="container mx-auto">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground">Как можно зарабатывать?</h2>
                    <p className="text-muted-foreground mt-2">Реальные кейсы от наших партнеров</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {steps.map((step) => (
                        <IncomeSourceCard 
                            key={step.title} 
                            step={step} 
                            isOpen={openCard === step.title}
                            onToggle={() => handleToggle(step.title)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

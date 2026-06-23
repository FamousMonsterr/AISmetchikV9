"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from "@/lib/motion";
import { GlassCard } from '@/components/ui/glass-card';
import { CtaButton } from "@/components/landing/CtaButton";
import { Button } from "@/components/ui/button";
import { Briefcase, Megaphone, Database, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


const cases = [
    {
        id: "manager",
        icon: Briefcase,
        title: "История одного менеджера",
        description: "Как менеджер по продажам стал «Серебряным партнером», анонимно дал реферальную ссылку своей компании и создал пассивный доход, который скоро позволит ему уйти с основной работы.",
    },
    {
        id: "blogger",
        icon: Megaphone,
        title: "Для блогеров и лидеров мнений",
        description: "Ваш Telegram-канал, YouTube или блог — это мощный актив для пассивного дохода. Разместите реферальную ссылку в своих материалах, и каждая регистрация начнет приносить вам стабильный доход.",
    },
    {
        id: "sales",
        icon: Briefcase,
        title: "Для менеджеров по продажам",
        description: "Вы уже работаете с клиентами в сфере строительства или безопасности? Предлагайте 'Montage HUB' как дополнительную ценность при продаже основного оборудования.",
    },
    {
        id: "agent",
        icon: Users,
        title: "Для агентов и консультантов",
        description: "Если у вас есть наработанная база клиентов (например, по продаже лицензий МЧС или допусков СРО), предложите им наш сервис. Это идеальное дополнение к вашим услугам.",
    },
];

const DesktopView = ({ onCtaClick }: { onCtaClick: () => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((useCase, index) => (
            <motion.div
                key={useCase.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
            >
                <GlassCard className="h-full flex flex-col">
                    <div className="flex flex-col flex-grow p-2 sm:p-4">
                        <div className="mb-4">
                            <useCase.icon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{useCase.title}</h3>
                        <p className="text-muted-foreground mt-2 text-base flex-grow">{useCase.description}</p>
                        <div className="mt-6">
                            <CtaButton href="#" onClick={onCtaClick}>
                                Стать партнером
                            </CtaButton>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        ))}
    </div>
);


const MobileView = ({ onCtaClick }: { onCtaClick: () => void }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const nextCase = () => setActiveIndex((prev) => (prev + 1) % cases.length);
    const prevCase = () => setActiveIndex((prev) => (prev - 1 + cases.length) % cases.length);

    return (
        <div className="relative h-[600px] max-w-sm mx-auto">
            <AnimatePresence>
                {cases.map((activeCase, index) => {
                    const isActive = index === activeIndex;
                    const isNext = index === (activeIndex + 1) % cases.length;
                    const isPrev = index === (activeIndex - 1 + cases.length) % cases.length;

                    let animateState = "center";
                    if (!isActive) {
                        if (isNext) animateState = "right";
                        else if (isPrev) animateState = "left";
                        else animateState = "back";
                    }

                    const variants = {
                        center: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, zIndex: cases.length },
                        left: { x: -50, y: 10, scale: 0.9, rotate: -5, opacity: 0.7, zIndex: cases.length - 1 },
                        right: { x: 50, y: 10, scale: 0.9, rotate: 5, opacity: 0.7, zIndex: cases.length - 1 },
                        back: { x: 0, y: 20, scale: 0.8, rotate: 0, opacity: 0.5, zIndex: cases.length - 2 },
                        exit: (direction: number) => ({
                            x: direction < 0 ? -300 : 300,
                            y: 50,
                            opacity: 0,
                            rotate: direction < 0 ? -30 : 30,
                            transition: { duration: 0.4 }
                        }),
                    };

                    if (!isActive && !isNext && !isPrev) return null;

                    return (
                        <motion.div
                            key={activeCase.id}
                            custom={activeIndex - index}
                            variants={variants}
                            initial="back"
                            animate={animateState}
                            exit="exit"
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(event, { offset, velocity }) => {
                                if (Math.abs(offset.x) > 100) {
                                    if (offset.x > 0) prevCase(); else nextCase();
                                }
                            }}
                            className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
                            style={{ originX: 0.5, originY: 1 }}
                        >
                            <GlassCard className="h-full flex flex-col">
                                <div className="p-2 sm:p-4 flex flex-col flex-grow">
                                    <div className="mb-4">
                                        <activeCase.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{activeCase.title}</h3>
                                    <p className="text-muted-foreground mt-2 text-base flex-grow">{activeCase.description}</p>
                                    <div className="mt-6">
                                        <CtaButton href="#" onClick={onCtaClick}>
                                            Стать партнером
                                        </CtaButton>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-12 w-12 bg-card/80 backdrop-blur-lg" onClick={prevCase}><ChevronLeft/></Button>
            <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full h-12 w-12 bg-card/80 backdrop-blur-lg" onClick={nextCase}><ChevronRight/></Button>
        </div>
    );
};

export const UseCasesSection = () => {
    const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = useState(false);
    const isMobile = useIsMobile();

    const handleCtaClick = () => setIsPartnerRegisterOpen(true);

    return (
        <>
            <LegalEntityRegistrationDialog isOpen={isPartnerRegisterOpen} onClose={() => setIsPartnerRegisterOpen(false)} isPartnerRegistration={true} />
            <section className="py-20" id="use-cases">
                <div className="container mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground">Как можно зарабатывать?</h2>
                        <p className="text-muted-foreground mt-2">Реальные кейсы от наших партнеров</p>
                    </div>

                    {isMobile ? (
                        <MobileView onCtaClick={handleCtaClick} />
                    ) : (
                        <DesktopView onCtaClick={handleCtaClick} />
                    )}
                </div>
            </section>
        </>
    );
};


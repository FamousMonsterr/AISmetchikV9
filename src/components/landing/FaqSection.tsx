// src/components/landing/FaqSection.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlassCard } from "../ui/glass-card";
import { Logo } from "../Logo";
import { motion } from '@/lib/motion';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { CtaButton } from "./CtaButton";
import { useState } from "react";
import { RegistrationDialog } from "@/components/RegistrationDialog";

export const FaqSection = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const faqs = [
        { q: "Какие форматы файлов поддерживает Montage HUB?", a: "Мы работаем с PDF-файлами, сканами и даже фотографиями проектной документации. ИИ распознает спецификации в любом качестве." },
        { q: "Насколько точен AI-анализ?", a: "Наш ИИ достигает 95% точности, а благодаря 'Циклу Уточнения' вы можете довести результат до 100% правильности." },
        { q: "Можно ли использовать свои цены?", a: "Да! В PRO-версии есть приватная база цен, куда вы загружаете свои прайс-листы, и система автоматически подбирает ваши цены." },
        { q: "Как происходит оплата?", a: "Система работает на кредитах. За каждый анализ списывается определенное количество кредитов. Кредиты приобретаются пакетами и не сгорают." },
        { q: "Есть ли мобильное приложение?", a: "Да, доступно PWA-приложение и Telegram-бот. Вы можете работать со сметами прямо с телефона." },
        { q: "Можно ли интегрировать с CRM?", a: "Да, на тарифах Business и Enterprise доступна интеграция с AmoCRM, Битрикс24 и другими системами через API." },
    ];

    return (
        <>
        <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        <section id="faq" className="py-20 relative">
            <div className="absolute inset-0 -z-10">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                        <HelpCircle className="h-4 w-4" />
                        FAQ
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Часто задаваемые вопросы</h2>
                    <p className="text-muted-foreground mt-3 text-lg flex items-center justify-center gap-2">
                        <span>Ответы на основные вопросы о</span>
                        <Logo />
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <GlassCard interactive={false}>
                        <Accordion type="single" collapsible defaultValue="item-0">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                                    <AccordionTrigger className="text-left text-foreground hover:text-foreground/80 hover:no-underline py-5">
                                        <span className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                                                {index + 1}
                                            </span>
                                            {faq.q}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground pl-9 pb-5">
                                        {faq.a}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </GlassCard>
                </motion.div>

                {/* Additional help */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-12 text-center"
                >
                    <p className="text-muted-foreground mb-4">Не нашли ответ на свой вопрос?</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="secondary" size="sm">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Написать в поддержку
                        </CtaButton>
                    </div>
                </motion.div>
            </div>
        </section>
        </>
    );
};

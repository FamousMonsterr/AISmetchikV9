// src/components/landing/FaqSection.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlassCard } from "../ui/glass-card";
import { Logo } from "../Logo";

export const FaqSection = () => {
    const faqs = [
        { q: "Какие форматы файлов поддерживает AI Сметчик?", a: "Мы работаем с PDF-файлами, сканами и даже фотографиями проектной документации. ИИ распознает спецификации в любом качестве." },
        { q: "Насколько точен AI-анализ?", a: "Наш ИИ достигает 95% точности, а благодаря 'Циклу Уточнения' вы можете довести результат до 100% правильности." },
        { q: "Можно ли использовать свои цены?", a: "Да! В PRO-версии есть приватная база цен, куда вы загружаете свои прайс-листы, и система автоматически подбирает ваши цены." },
        { q: "Как происходит оплата?", a: "Система работает на кредитах. За каждый анализ списывается определенное количество кредитов. Кредиты приобретаются пакетами и не сгорают." },
    ];
    return (
        <section id="faq" className="py-20">
            <div className="container mx-auto max-w-3xl">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground">Часто задаваемые вопросы</h2>
                    <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <span>Ответы на основные вопросы о</span>
                        <Logo />
                    </p>
                </div>
                <GlassCard interactive={false}>
                    <Accordion type="single" collapsible defaultValue="item-0">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="text-left text-foreground hover:text-foreground/80">{faq.q}</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </GlassCard>
            </div>
        </section>
    );
};

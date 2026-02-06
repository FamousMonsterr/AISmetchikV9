// src/components/landing/FeaturesSection.tsx
"use client";

import { GlassCard } from '@/components/ui/glass-card';
import { PlanBadge } from '@/components/PlanBadge';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const FeaturesSection = () => {
    const features = [
        { title: "AI-Анализ документации", description: "Автоматическое извлечение спецификации из PDF, сканов и фотографий проектов.", benefit: "Сокращает время создания сметы до 2-5 минут." },
        { title: "Цикл Уточнения", description: "Совместная работа с ИИ для исправления ошибок и повышения точности.", benefit: "100% контроль результата." },
        { title: "База цен PRO", description: "Приватная база цен с автоматическим подбором по моделям и артикулам.", benefit: "Управление прибылью.", pro: true },
        { title: "Управление проектами", description: "История всех расчетов, черновики, архивация проектов.", benefit: "Порядок в документах." },
        { title: "Генерация КП", description: "Профессиональные PDF и Excel файлы с вашими реквизитами.", benefit: "Профессиональный имидж." },
        { title: "Управление контрагентами", description: "Адресная книга реквизитов компаний и ИП.", benefit: "Всё под рукой." }
    ];

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.05,
                duration: 0.5,
            },
        }),
    };

    return (
        <motion.section 
            id="features" 
            className="py-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.2 }}
        >
            <div className="container mx-auto">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl font-bold text-foreground">Ключевые функции</h2>
                    <p className="text-muted-foreground mt-2">Всё необходимое для профессиональной работы со сметами</p>
                </motion.div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                         <motion.div
                            key={index}
                            custom={index}
                            variants={cardVariants}
                         >
                            <GlassCard className="h-full" gradient="none">
                                <div className="flex flex-col h-full">
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        {feature.title}
                                        {feature.pro && <PlanBadge plan="PRO" icon={<Star className="h-3 w-3" />} />}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 flex-grow">{feature.description}</p>
                                    <p className="text-sm font-semibold text-primary mt-4">{feature.benefit}</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
};

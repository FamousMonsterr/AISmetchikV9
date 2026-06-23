// src/components/landing/FeaturesSection.tsx
"use client";

import { GlassCard } from '@/components/ui/glass-card';
import { PlanBadge } from '@/components/PlanBadge';
import { Star, FileText, RefreshCw, Database, FolderOpen, FileOutput, Users } from 'lucide-react';
import { motion } from '@/lib/motion';

export const FeaturesSection = () => {
    const features = [
        {
            icon: FileText,
            title: "AI-Анализ документации",
            description: "Автоматическое извлечение спецификации из PDF, сканов и фотографий проектов.",
            benefit: "Сокращает время создания сметы до 2-5 минут.",
            color: "text-blue-500 bg-blue-500/10"
        },
        {
            icon: RefreshCw,
            title: "Цикл Уточнения",
            description: "Совместная работа с ИИ для исправления ошибок и повышения точности.",
            benefit: "100% контроль результата.",
            color: "text-purple-500 bg-purple-500/10"
        },
        {
            icon: Database,
            title: "База цен PRO",
            description: "Приватная база цен с автоматическим подбором по моделям и артикулам.",
            benefit: "Управление прибылью.",
            pro: true,
            color: "text-amber-500 bg-amber-500/10"
        },
        {
            icon: FolderOpen,
            title: "Управление проектами",
            description: "История всех расчетов, черновики, архивация проектов.",
            benefit: "Порядок в документах.",
            color: "text-emerald-500 bg-emerald-500/10"
        },
        {
            icon: FileOutput,
            title: "Генерация КП",
            description: "Профессиональные PDF и Excel файлы с вашими реквизитами.",
            benefit: "Профессиональный имидж.",
            color: "text-rose-500 bg-rose-500/10"
        },
        {
            icon: Users,
            title: "Управление контрагентами",
            description: "Адресная книга реквизитов компаний и ИП.",
            benefit: "Всё под рукой.",
            color: "text-cyan-500 bg-cyan-500/10"
        }
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
            className="py-20 relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.2 }}
        >
            {/* Background accent */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2" />
            </div>

            <div className="container mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                        Возможности
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ключевые функции</h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Всё необходимое для профессиональной работы со сметами</p>
                </motion.div>

                {/* Featured card - AI Analysis */}
                <motion.div
                    custom={0}
                    variants={cardVariants}
                    className="mb-8"
                >
                    <GlassCard className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-xl font-semibold text-foreground flex items-center gap-3">
                                    AI-Анализ документации
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Ключевая функция</span>
                                </h3>
                                <p className="text-muted-foreground mt-2 text-lg">
                                    Загрузите PDF, скан или фотографию — ИИ автоматически извлечёт спецификацию,
                                    подберёт цены и создаст структурированную смету за считанные минуты.
                                </p>
                            </div>
                            <div className="flex-shrink-0 px-6 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-lg">
                                2-5 мин
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Other features grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.slice(1).map((feature, index) => (
                         <motion.div
                            key={index}
                            custom={index + 1}
                            variants={cardVariants}
                         >
                            <GlassCard className="h-full">
                                <div className="flex flex-col h-full">
                                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        {feature.title}
                                        {feature.pro && <PlanBadge plan="PRO" icon={<Star className="h-3 w-3" />} />}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 flex-grow">{feature.description}</p>
                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <p className="text-sm font-semibold text-primary">{feature.benefit}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
};

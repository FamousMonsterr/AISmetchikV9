"use client";
import { GlassCard } from "../ui/glass-card";
import { motion } from '@/lib/motion';
import { Puzzle, ArrowRight, CheckCircle } from 'lucide-react';
import { CtaButton } from "./CtaButton";

const integrations = [
    { name: "AmoCRM", description: "Автоматическая передача смет в сделки" },
    { name: "Битрикс24", description: "Синхронизация проектов и документов" },
    { name: "1С:Предприятие", description: "Выгрузка смет в формате 1С" },
];

export const IntegrationsSection = () => (
    <section className="py-20 relative">
        <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-purple-500/5 via-primary/5 to-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <GlassCard className="text-center p-8 md:p-12" interactive={false}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
                        <Puzzle className="h-4 w-4" />
                        Интеграции
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        Интеграция с вашими инструментами
                    </h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
                        Работайте в привычной среде. Доступно на тарифах Business и Enterprise.
                    </p>

                    <div className="mt-12 grid md:grid-cols-3 gap-6">
                        {integrations.map((integration, index) => (
                            <motion.div
                                key={integration.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                className="p-6 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Puzzle className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">{integration.name}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{integration.description}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>API для кастомных интеграций</span>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    </section>
);

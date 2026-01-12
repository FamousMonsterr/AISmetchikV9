"use client";
import React from 'react';
import { motion } from "framer-motion";
import { GlassCard } from '@/components/ui/glass-card';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { CountUp } from '@/components/CountUp';

const stats = [
    {
        icon: DollarSign,
        value: 90,
        label: "млрд. рублей",
        description: "Объем рынка слаботочных систем"
    },
    {
        icon: TrendingUp,
        value: 37,
        label: "% в год",
        description: "Рост рынка"
    },
    {
        icon: Users,
        value: 425,
        label: "тысяч специалистов",
        description: "Ваша потенциальная аудитория"
    }
];

export const MarketNumbersSection = () => {
    return (
        <section className="py-20 bg-background/30">
            <div className="container mx-auto">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl font-bold text-foreground">Окно возможностей в цифрах</h2>
                    <p className="text-muted-foreground mt-2">Рынок слаботочных систем — это не просто ниша, это растущая индустрия.</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <GlassCard className="text-center p-8 h-full">
                                <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                                    <stat.icon className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-5xl font-extrabold text-foreground flex items-baseline justify-center">
                                    <CountUp end={stat.value} duration={2} />
                                    <span className="text-4xl ml-1">{index === 0 ? '+' : ''}</span>
                                </div>
                                <p className="text-lg font-semibold text-primary">{stat.label}</p>
                                <p className="text-sm text-muted-foreground mt-2">{stat.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

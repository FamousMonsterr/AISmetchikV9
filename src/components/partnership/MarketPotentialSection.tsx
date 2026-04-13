"use client";
import React from 'react';
import { motion } from "@/lib/motion";
import { GlassCard } from '@/components/ui/glass-card';
import { CountUp } from '@/components/CountUp';
import { Briefcase, User, UserCog, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import plansConfig from '@/lib/plans-config.json';


// Helper component to format large numbers and animate them
const FormattedCountUp = ({ value, duration = 2.5 }: { value: number, duration?: number }) => {
    let displayValue = value;
    let suffix = '';

    if (value >= 1_000_000_000) {
        displayValue = value / 1_000_000_000;
        suffix = ' млрд.';
    } else if (value >= 1_000_000) {
        displayValue = value / 1_000_000;
        suffix = ' млн.';
    }

    // Determine decimal places
    const formattedValue = parseFloat(displayValue.toFixed(1));

    return (
        <>
            <CountUp end={formattedValue} duration={duration} />
            {suffix}
        </>
    );
};


const MarketPotentialSection = () => {
    const proYearlyPrice = 2990 * 12 * 0.75;
    const businessYearlyPrice = 2000 * 12 * 0.75;
    const freeWithCreditsPrice = 1000;
    const enterprisePrice = 1500000;

    const calculations = [
        {
            audience: "Неформальный сектор",
            icon: User,
            color: "var(--color-informal)",
            users: 100000,
            price: freeWithCreditsPrice,
            description: "по 1000 ₽ на кредиты"
        },
        {
            audience: "Самозанятые",
            icon: UserCog,
            color: "var(--color-self-employed)",
            users: 275000,
            price: proYearlyPrice,
            description: `по тарифу PRO`
        },
        {
            audience: "Компании (Business)",
            icon: Briefcase,
            color: "var(--color-companies)",
            users: 45000 * 5, // 90% of 50k companies with 5 users each
            price: businessYearlyPrice,
            description: `по тарифу Business (в среднем по 5 чел.)`
        },
        {
            audience: "Компании (Enterprise)",
            icon: TrendingUp,
            color: "var(--color-enterprise)",
            users: 5000, // 10% of 50k companies
            price: enterprisePrice,
            description: "по тарифу Enterprise"
        }
    ];

    const totalMarket = calculations.reduce((sum, item) => sum + item.users * item.price, 0);

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.15,
                duration: 0.5,
                ease: 'easeOut' as const
            },
        }),
    };

    return (
        <section className="py-20 relative bg-background overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-grid-black/[0.05] dark:bg-grid-white/[0.05]" />
            <div className="container mx-auto text-center">
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl font-bold text-foreground mb-4"
                >
                    Емкость потенциальных пользователей за 2026 год
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-muted-foreground max-w-2xl mx-auto mb-12"
                >
                    Расчет на основе годовых подписок по тарифам со скидкой и минимальных трат на кредиты.
                </motion.p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {calculations.map((calc, index) => {
                        const Icon = calc.icon;
                        const itemTotal = calc.users * calc.price;
                        return (
                             <motion.div key={calc.audience} custom={index} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                                <GlassCard className="h-full" interactive={false}>
                                    <div className="p-3 bg-card rounded-full w-fit mx-auto mb-3">
                                        <Icon className="h-6 w-6" style={{ color: calc.color }}/>
                                    </div>
                                    <h3 className="text-lg font-semibold">{calc.audience}</h3>
                                    <p className="text-xs text-muted-foreground">{calc.description}</p>
                                    <div className="mt-2 text-2xl font-bold" style={{ color: calc.color }}>
                                       <FormattedCountUp value={itemTotal} /> ₽
                                    </div>
                                    <p className="text-xs text-muted-foreground">({calc.users.toLocaleString('ru-RU')} x {calc.price.toLocaleString('ru-RU')} ₽)</p>
                                </GlassCard>
                            </motion.div>
                        )
                    })}
                </div>
                 <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.7, delay: 0.5, type: 'spring' }}
                >
                    <p className="text-lg text-muted-foreground">Емкость рынка в год составляет</p>
                    <div className="my-2 text-6xl font-extrabold text-primary sm:text-7xl md:text-8xl lg:text-9xl">
                        <FormattedCountUp value={totalMarket} duration={3} /> ₽
                    </div>
                     <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="text-lg font-semibold text-muted-foreground mt-4"
                    >
                        И ты можешь получить свою долю.
                    </motion.p>
                </motion.div>
            </div>
        </section>
    );
};

export { MarketPotentialSection };


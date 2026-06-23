"use client";
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from '@/lib/motion';
import { Clock, Smartphone, TrendingUp, Quote } from 'lucide-react';

const stories = [
    {
        icon: Clock,
        title: "История Монтажника",
        quote: "Раньше я тратил вечера на просчеты, теперь делаю это в обеденный перерыв.",
        description: "Устав от бесконечных правок и сложных проектов, я нашел этот сервис. Теперь я считаю смету за 30 минут, не завишу от сметчика и отправляю клиенту готовое КП прямо в WhatsApp. Это освободило мне вечера для семьи.",
        author: "Алексей, частный монтажник",
        metric: "30 мин",
        metricLabel: "вместо 3 часов",
        color: "text-blue-500 bg-blue-500/10"
    },
    {
        icon: Smartphone,
        title: "История Сметчика на фрилансе",
        quote: "Я увеличил свой доход в 5 раз, работая с телефона.",
        description: "Раньше на один проект уходили дни. Теперь я беру заказы с work-zilla.com и считаю по 10 проектов в день, пока еду в метро. Каждый проект по 1000 рублей — это 10 000 в день параллельно основной работе. Полная свобода.",
        author: "Виктор, инженер-сметчик",
        metric: "5x",
        metricLabel: "рост дохода",
        color: "text-purple-500 bg-purple-500/10"
    },
    {
        icon: TrendingUp,
        title: "История Проектного менеджера",
        quote: "Я стал экспертом в глазах заказчика на первой же встрече.",
        description: "На переговорах я теперь могу мгновенно оценить проект на 50 страниц и сформировать бюджет. Это производит вау-эффект. Мы по-прежнему используем наш сметный отдел для ювелирной работы, но для быстрой оценки на ранних стадиях — это незаменимый инструмент.",
        author: "Ирина, проектный менеджер",
        metric: "50 стр",
        metricLabel: "за минуту",
        color: "text-emerald-500 bg-emerald-500/10"
    }
];

export const SuccessStoriesSection = () => {
    return (
        <section className="py-20 bg-background/30 relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-purple-500/5 to-transparent rounded-full blur-3xl" />
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
                        Кейсы
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Истории успеха</h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Как Montage HUB меняет работу наших пользователей.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {stories.map((story, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <GlassCard className="h-full flex flex-col relative overflow-hidden">
                                {/* Metric badge */}
                                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-muted/50 text-center">
                                    <div className="text-lg font-bold text-foreground">{story.metric}</div>
                                    <div className="text-xs text-muted-foreground">{story.metricLabel}</div>
                                </div>

                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl ${story.color} flex items-center justify-center`}>
                                            <story.icon className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground pr-16">{story.title}</h3>
                                    </div>

                                    {/* Quote with icon */}
                                    <div className="relative mb-4">
                                        <Quote className="absolute -left-1 -top-1 h-8 w-8 text-primary/20" />
                                        <blockquote className="pl-8 italic text-foreground text-lg leading-relaxed">
                                            {story.quote}
                                        </blockquote>
                                    </div>

                                    <p className="text-sm text-muted-foreground leading-relaxed">{story.description}</p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-border/50">
                                    <p className="text-sm font-semibold text-foreground">— {story.author}</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

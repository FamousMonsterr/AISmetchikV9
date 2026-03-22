"use client";
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from '@/lib/motion';
import { Clock, Smartphone, TrendingUp } from 'lucide-react';

const stories = [
    {
        icon: Clock,
        title: "История Монтажника",
        quote: "Раньше я тратил вечера на просчеты, теперь делаю это в обеденный перерыв.",
        description: "Устав от бесконечных правок и сложных проектов, я нашел этот сервис. Теперь я считаю смету за 30 минут, не завишу от сметчика и отправляю клиенту готовое КП прямо в WhatsApp. Это освободило мне вечера для семьи.",
        author: "Алексей, частный монтажник"
    },
    {
        icon: Smartphone,
        title: "История Сметчика на фрилансе",
        quote: "Я увеличил свой доход в 5 раз, работая с телефона.",
        description: "Раньше на один проект уходили дни. Теперь я беру заказы с work-zilla.com и считаю по 10 проектов в день, пока еду в метро. Каждый проект по 1000 рублей — это 10 000 в день параллельно основной работе. Полная свобода.",
        author: "Виктор, инженер-сметчик"
    },
    {
        icon: TrendingUp,
        title: "История Проектного менеджера",
        quote: "Я стал экспертом в глазах заказчика на первой же встрече.",
        description: "На переговорах я теперь могу мгновенно оценить проект на 50 страниц и сформировать бюджет. Это производит вау-эффект. Мы по-прежнему используем наш сметный отдел для ювелирной работы, но для быстрой оценки на ранних стадиях — это незаменимый инструмент.",
        author: "Ирина, проектный менеджер"
    }
];

export const SuccessStoriesSection = () => {
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
                    <h2 className="text-3xl font-bold text-foreground">Истории успеха</h2>
                    <p className="text-muted-foreground mt-2">Как AI Сметчик меняет работу наших пользователей.</p>
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {stories.map((story, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <GlassCard className="h-full flex flex-col">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="bg-primary/10 text-primary p-3 rounded-full w-fit">
                                            <story.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground">{story.title}</h3>
                                    </div>
                                    <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
                                        {story.quote}
                                    </blockquote>
                                    <p className="text-sm text-muted-foreground">{story.description}</p>
                                </div>
                                <p className="text-sm font-semibold text-right mt-4 pt-4 border-t border-border/10">- {story.author}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};


"use client";
import { motion } from "framer-motion";
import { GlassCard } from '@/components/ui/glass-card';
import { PlayCircle } from 'lucide-react';

export const VideoSection = () => (
    <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="py-10"
    >
        <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground">Узнайте больше за 2 минуты</h2>
                <p className="text-muted-foreground mt-2">Посмотрите короткое видео-приглашение в партнерскую программу.</p>
            </div>
            <GlassCard interactive={false}>
                <div className="aspect-video w-full flex items-center justify-center bg-muted/50 rounded-lg">
                    <div className="text-center text-muted-foreground">
                        <PlayCircle className="h-16 w-16 mx-auto mb-2 opacity-50" />
                        <p>Здесь будет ваше видео</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    </motion.section>
);

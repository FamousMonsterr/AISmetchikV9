"use client";
import { GlassCard } from "../ui/glass-card";

export const IntegrationsSection = () => (
    <section className="py-20">
        <div className="container mx-auto">
             <GlassCard className="text-center" interactive={false}>
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground">Интеграция с вашими инструментами</h2>
                    <p className="text-muted-foreground mt-2">Работайте в привычной среде. Доступно на тарифах Business и Enterprise.</p>
                </div>
                <div className="flex justify-center items-center gap-8 flex-wrap">
                    <p className="font-bold text-2xl text-muted-foreground">AmoCRM</p>
                    <p className="font-bold text-2xl text-muted-foreground">Битрикс24</p>
                    <p className="font-bold text-2xl text-muted-foreground">1С:Предприятие</p>
                </div>
            </GlassCard>
        </div>
    </section>
);

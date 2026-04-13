"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "@/lib/motion";
import { GlassCard } from '@/components/ui/glass-card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts";
import { Badge } from '@/components/ui/badge';
import { Briefcase, User, UserCog } from 'lucide-react';

const chartData = [
  { audience: "Самозанятые", value: 275000, icon: UserCog },
  { audience: "Неформальный сектор", value: 100000, icon: User },
  { audience: "Компании и ИП", value: 50000, icon: Briefcase },
];

const COLORS = ["hsl(220, 74%, 59%)", "hsl(160, 50%, 50%)", "hsl(350, 75%, 60%)"];

const chartConfig = {
  value: {
    label: "Специалисты",
  },
  "Самозанятые": {
    label: "Самозанятые",
    color: COLORS[0],
  },
  "Неформальный сектор": {
    label: "Неформальный сектор",
    color: COLORS[1],
  },
  "Компании и ИП": {
    label: "Компании и ИП",
    color: COLORS[2],
  },
} satisfies import("@/components/ui/chart").ChartConfig;

export const TargetAudienceSection = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <section className="py-20">
      <div className="container mx-auto">
        <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <h2 className="text-3xl font-bold text-foreground">Ваша целевая аудитория — кто они?</h2>
            <p className="text-muted-foreground mt-2">Более 425 000 специалистов ждут современный инструмент.</p>
        </motion.div>
        <GlassCard>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-[350px] w-full">
                    {isClient && (
                         <ChartContainer
                            config={chartConfig}
                            className="w-full h-full"
                        >
                            <PieChart>
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                              />
                              <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="audience"
                                innerRadius={80}
                                strokeWidth={5}
                              >
                                 {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                    )}
                </div>
                 <div className="space-y-6">
                    {chartData.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <motion.div 
                                key={item.audience}
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="flex items-start gap-4"
                            >
                                <div className="p-3 bg-card rounded-full">
                                     <Icon className="h-6 w-6" style={{color: COLORS[index % COLORS.length]}} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        {item.audience}
                                        <Badge variant="outline">{item.value.toLocaleString('ru-RU')} чел.</Badge>
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {item.audience === "Самозанятые" && "Огромный и самый быстрорастущий сегмент. Нуждаются в простых и эффективных инструментах для легальной работы."}
                                        {item.audience === "Неформальный сектор" && "Мастера, работающие на себя. Идеальная аудитория для бесплатного тарифа, который вы можете монетизировать через партнерскую программу."}
                                        {item.audience === "Компании и ИП" && "Устоявшиеся игроки рынка. Ваши потенциальные клиенты на тарифы Business и Enterprise с интеграциями и дополнительными услугами."}
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </GlassCard>
      </div>
    </section>
  );
};


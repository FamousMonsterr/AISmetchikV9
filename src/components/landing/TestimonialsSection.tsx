"use client";

import { GlassCard } from "../ui/glass-card";
import { motion } from '@/lib/motion';
import { Quote, Star } from 'lucide-react';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Алексей В.",
      role: "Инженер ПТО",
      text: "Средняя смета по офисному объекту стала собираться за минуты. Скорость выросла без потери контроля по составу и цене.",
      rating: 5,
    },
    {
      name: "Елена С.",
      role: "Сметчик-фрилансер",
      text: "Сервис удобно использовать как рабочий черновик: структура уже готова, а мне остаётся проверить логику и довести документ до финала.",
      rating: 5,
    },
    {
      name: "Игорь М.",
      role: "Руководитель монтажной бригады",
      text: "Мы быстрее отвечаем клиентам и не теряем темп на старте сделки. Для подрядного бизнеса это даёт реальное преимущество.",
      rating: 5,
    },
    {
      name: "Юлия А.",
      role: "Менеджер по развитию",
      text: "После интеграции с CRM смета перестала жить отдельно от процесса. Статусы, документы и передача дальше стали заметно чище.",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
            Отзывы
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Как это ощущается в работе</h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Не рекламные лозунги, а короткие наблюдения людей, которые реально считают и отправляют сметы.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassCard className="h-full" interactive={false}>
                <div className="flex h-full flex-col justify-between gap-6">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative">
                    <Quote className="absolute -left-1 -top-1 h-6 w-6 text-primary/20" />
                    <p className="text-base leading-7 text-foreground pl-6">"{item.text}"</p>
                  </div>

                  {/* Author */}
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

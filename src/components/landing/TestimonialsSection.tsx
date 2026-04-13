"use client";

import { GlassCard } from "../ui/glass-card";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Алексей В.",
      role: "Инженер ПТО",
      text: "Средняя смета по офисному объекту стала собираться за минуты. Скорость выросла без потери контроля по составу и цене.",
    },
    {
      name: "Елена С.",
      role: "Сметчик-фрилансер",
      text: "Сервис удобно использовать как рабочий черновик: структура уже готова, а мне остаётся проверить логику и довести документ до финала.",
    },
    {
      name: "Игорь М.",
      role: "Руководитель монтажной бригады",
      text: "Мы быстрее отвечаем клиентам и не теряем темп на старте сделки. Для подрядного бизнеса это даёт реальное преимущество.",
    },
    {
      name: "Юлия А.",
      role: "Менеджер по развитию",
      text: "После интеграции с CRM смета перестала жить отдельно от процесса. Статусы, документы и передача дальше стали заметно чище.",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-bold text-foreground">Как это ощущается в работе</h2>
          <p className="mt-2 text-muted-foreground">
            Не рекламные лозунги, а короткие наблюдения людей, которые реально считают и отправляют сметы.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((item) => (
            <GlassCard key={item.name} className="h-full" interactive={false}>
              <div className="flex h-full flex-col justify-between gap-6">
                <p className="text-base leading-7 text-foreground">“{item.text}”</p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

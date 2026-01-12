"use client";
import { GlassCard } from "../ui/glass-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const TestimonialsSection = () => {
    const testimonials = [
        { name: "Алексей В.", role: "Инженер ПТО", image: "21", text: "Это просто пушка! Раньше на смету для среднего офиса уходило полдня. Сейчас — 15 минут с кофе. Время — деньги, и этот сервис экономит мне и то, и другое." },
        { name: "Елена С.", role: "Сметчик-фрилансер", image: "22", text: "Я сомневалась, сможет ли ИИ понять наши ГОСТы и стандарты. Но он справляется! А 'Цикл Уточнения' позволяет довести все до идеала. Беру в 3 раза больше заказов." },
        { name: "Игорь М.", role: "Руководитель монтажной бригады", image: "23", text: "Главное — скорость. Получил проект от заказчика, через 5 минут у него на почте КП. Это производит впечатление. Клиенты думают, что у меня штат сметчиков." },
        { name: "Светлана И.", role: "Проектный менеджер", image: "24", text: "Использую для быстрой оценки бюджета на ранних стадиях. Больше никаких 'пальцем в небо'. Это помогает выстраивать доверительные отношения с клиентом с самого начала." },
        { name: "Дмитрий П.", role: "Частный мастер", image: "25", text: "PRO-версия с базой цен — это находка. Я один раз занес свои цены на работы, и теперь каждая смета считается с моей маржой. Полный контроль над прибылью." },
        { name: "Анна К.", role: "Начинающий сметчик", image: "26", text: "Этот сервис — мой личный наставник. Я смотрю, как ИИ разбирает проекты, и учусь. Моя скорость и точность выросли в разы за первый же месяц." },
        { name: "Виктор Н.", role: "Владелец небольшой компании", image: "27", text: "Раньше держал сметчика в штате. Теперь справляемся сами, а сэкономленные деньги вложили в новый инструмент. Сервис окупился за 2 недели." },
        { name: "Ольга З.", role: "Инженер-проектировщик", image: "28", text: "Иногда присылают сканы ужасного качества. Думала, тут ИИ не справится. Ошиблась. Распознает даже то, что я сама с трудом разбираю. Фантастика!" },
        { name: "Максим Г.", role: "Снабженец", image: "29", text: "Мгновенно получаю список оборудования и артикулов для заказа. Больше не нужно перепечатывать все вручную из PDF. Исключены ошибки при заказе." },
        { name: "Юлия А.", role: "Менеджер по развитию", image: "30", text: "Мы интегрировали сервис через API в нашу CRM. Теперь сделка автоматически создается вместе со сметой. Это вывело наш отдел продаж на новый уровень." },
    ];

    const duplicatedTestimonials = [...testimonials, ...testimonials];

    return (
        <section className="py-20 bg-background/50 overflow-hidden">
            <div className="container mx-auto text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground">Что говорят наши пользователи</h2>
            </div>
            <div className="relative w-full">
                <div className="flex w-max animate-[marquee_60s_linear_infinite] hover:[animation-play-state:paused]">
                    {duplicatedTestimonials.map((t, i) => (
                        <div key={`d1-${i}`} className="w-[350px] mx-4 shrink-0">
                            <GlassCard>
                                <p className="text-foreground text-left">"{t.text}"</p>
                                <div className="flex items-center mt-4">
                                    <Avatar className="h-12 w-12 mr-4">
                                        <AvatarImage data-ai-hint="person" src={`https://picsum.photos/seed/${t.image}/100/100`} />
                                        <AvatarFallback>{t.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-foreground text-left">{t.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{t.role}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
                 <div className="flex w-max animate-[marquee-reverse_60s_linear_infinite] hover:[animation-play-state:paused] mt-8">
                    {testimonials.reverse().map((t, i) => (
                        <div key={`d2-${i}`} className="w-[350px] mx-4 shrink-0">
                            <GlassCard>
                                <p className="text-foreground text-left">"{t.text}"</p>
                                <div className="flex items-center mt-4">
                                    <Avatar className="h-12 w-12 mr-4">
                                        <AvatarImage data-ai-hint="person face" src={`https://picsum.photos/seed/${t.image}/100/100`} />
                                        <AvatarFallback>{t.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-foreground text-left">{t.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{t.role}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

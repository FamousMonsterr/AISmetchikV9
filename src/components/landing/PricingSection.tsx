// @ts-nocheck
// src/components/landing/PricingSection.tsx
"use client";

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Infinity, XCircle, Sparkles, Crown, Zap, Building2 } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { Input } from '../ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const planIcons = {
    free: Zap,
    pro: Sparkles,
    business: Crown,
    enterprise: Building2,
};

const planColors = {
    free: "text-muted-foreground bg-muted/50",
    pro: "text-primary bg-primary/10",
    business: "text-amber-500 bg-amber-500/10",
    enterprise: "text-purple-500 bg-purple-500/10",
};

const PlanCard = ({ plan, popular, pro, children, href, onCtaClick, isDisabled = false }: { plan: any, popular?: boolean, pro?: boolean, children: React.ReactNode, href: string, onCtaClick?: (e: React.MouseEvent<HTMLButtonElement>) => void, isDisabled?: boolean }) => {
    const Icon = planIcons[plan.key] || Zap;
    const colorClass = planColors[plan.key] || planColors.free;

    return (
        <GlassCard className={cn(
            "flex flex-col relative",
            popular && "border-2 border-primary/50 shadow-lg shadow-primary/10",
            isDisabled && "opacity-50 grayscale"
        )}>
            {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-primary text-primary-foreground shadow-lg">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Популярный
                    </Badge>
                </div>
            )}
            <div className="flex flex-col flex-grow">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorClass)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                            {plan.name}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>

                    <div className={cn("my-6 text-foreground", plan.name === "Тариф ENTERPRISE" ? "text-3xl" : "text-4xl font-semibold")}>
                        {plan.price}
                        {plan.price_suffix && <span className="text-lg font-normal text-muted-foreground">{plan.price_suffix}</span>}
                    </div>
                    {plan.totalPrice !== undefined && (
                        <div className="mb-4 p-3 rounded-xl bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">ИТОГО в мес:</p>
                            <p className="font-bold text-xl">{plan.totalPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</p>
                        </div>
                    )}
                </div>
                <div className="flex-grow">{children}</div>
            </div>
            <div className="mt-auto pt-6">
                <CtaButton href={href} variant={pro ? "primary" : "secondary"} size="md" onClick={onCtaClick} className="w-full justify-center" disabled={isDisabled}>{plan.cta}</CtaButton>
            </div>
        </GlassCard>
    );
};

const featureList = [
    { feature: "AI-Анализ документов", free: true, pro: true, business: true, enterprise: true },
    { feature: "Кредиты ежемесячно", free: "10", pro: "10", business: "По запросу", enterprise: "По запросу" },
    { feature: "Экспорт в Excel, DOCX, PDF", free: true, pro: true, business: true, enterprise: true },
    { feature: "История проектов", free: true, pro: true, business: true, enterprise: true },
    { feature: "Приложение PWA и Telegram-бот", free: true, pro: true, business: true, enterprise: true },
    { feature: "Сохранение версий (черновиков)", free: "до 3", pro: "до 10", business: "до 100", enterprise: "∞" },
    { feature: "Приватная база цен", free: false, pro: true, business: true, enterprise: true },
    { feature: "Импорт/Экспорт базы цен", free: false, pro: true, business: true, enterprise: true },
    { feature: "Группировка проектов по объектам", free: false, pro: true, business: true, enterprise: true },
    { feature: "Приоритетная поддержка", free: false, pro: true, business: true, enterprise: true },
    { feature: "Количество пользователей", free: "1", pro: "1", business: "3–24", enterprise: "от 25" },
    { feature: "API-доступ и CRM интеграции", free: false, pro: false, business: true, enterprise: true },
    { feature: "Персональный менеджер", free: false, pro: false, business: true, enterprise: true },
    { feature: "White Label, свой домен и On-premise", free: false, pro: false, business: false, enterprise: true },
    { feature: "Использование своего сервера LLM", free: false, pro: false, business: false, enterprise: true },
];


const FeatureComparisonTable = () => (
    <div className="mt-12">
        <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <span className="flex items-center gap-2">
                        Сравнение функций
                        <Badge variant="secondary" className="text-xs">15 позиций</Badge>
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[250px] font-semibold">Функция</TableHead>
                                    <TableHead className="text-center font-semibold">Free</TableHead>
                                    <TableHead className="text-center font-semibold text-primary">PRO</TableHead>
                                    <TableHead className="text-center font-semibold text-amber-600">Business</TableHead>
                                    <TableHead className="text-center font-semibold text-purple-600">Enterprise</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {featureList.map(({ feature, free, pro, business, enterprise }) => (
                                    <TableRow key={feature} className="hover:bg-muted/20">
                                        <TableCell className="font-medium">{feature}</TableCell>
                                        {[free, pro, business, enterprise].map((planFeature, i) => (
                                            <TableCell key={i} className="text-center">
                                                {typeof planFeature === 'boolean' ? (
                                                    planFeature ? <CheckCircle className="h-5 w-5 text-success mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto opacity-50" />
                                                ) : (
                                                    <span className="font-semibold">{planFeature}</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
);


export const PricingSection = () => {
    const [isLegalEntityModalOpen, setIsLegalEntityModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [employeeCount, setEmployeeCount] = useState(1);

    const handleCorporateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsLegalEntityModalOpen(true);
    };

    const handleRegisterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsRegisterModalOpen(true);
    }

    const proPrice = 2990;
    const businessPrice = 2000;

    const plans = {
        free: { key: "free", name: "Тариф FREE", description: "Для знакомства с сервисом и небольших задач.", price: "Бесплатно", cta: "Начать бесплатно" },
        pro: { key: "pro", name: "Тариф PRO", description: "Для профессионалов и регулярной работы.", price: proPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + "₽", price_suffix: "/мес", cta: "Выбрать PRO", totalPrice: proPrice },
        business: { key: "business", name: "Тариф BUSINESS", description: "Для команд и интеграции с бизнес-процессами.", price: businessPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + "₽", price_suffix: "/польз.", cta: "Оставить заявку", totalPrice: businessPrice * employeeCount },
        enterprise: { key: "enterprise", name: "Тариф ENTERPRISE", description: "Для крупных компаний и максимальной кастомизации.", price: "Индивидуально", cta: "Запросить Демо" }
    };

    return (
        <>
        <LegalEntityRegistrationDialog isOpen={isLegalEntityModalOpen} onClose={() => setIsLegalEntityModalOpen(false)} />
        <RegistrationDialog isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />
        <section id="pricing" className="py-20 relative">
            {/* Background accent */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/5 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                        Тарифы
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Тарифы и цены</h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Выберите план и пополняйте баланс кредитов по мере необходимости.</p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-muted/30">
                            <Label htmlFor="employees" className="text-sm">Сотрудников:</Label>
                            <Input
                                id="employees"
                                type="number"
                                min="1"
                                value={employeeCount}
                                onChange={(e) => setEmployeeCount(Number(e.target.value) || 1)}
                                className="w-20 h-8 text-center"
                            />
                        </div>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                   <PlanCard plan={plans.free} href="#" onCtaClick={handleRegisterClick} isDisabled={employeeCount > 1}>
                        <ul className="space-y-3 text-muted-foreground flex-grow">
                            <li className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span>1 Пользователь</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Базовый AI-анализ</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Экспорт в Excel, DOCX, PDF</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>История проектов</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>10 кредитов ежемесячно</span></li>
                        </ul>
                    </PlanCard>
                   <PlanCard plan={plans.pro} href="#" onCtaClick={handleRegisterClick} popular pro isDisabled={employeeCount > 1}>
                        <ul className="space-y-3 text-muted-foreground flex-grow">
                            <li className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span>1 Пользователь</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Приватная база цен</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Импорт/Экспорт базы в Excel</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Приоритетная поддержка</span></li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /><span>Приложение PWA и Telegram</span></li>
                        </ul>
                    </PlanCard>
                   <PlanCard plan={plans.business} href="#" onCtaClick={handleCorporateClick} isDisabled={employeeCount < 3 || employeeCount >= 25}>
                      <ul className="space-y-3 text-muted-foreground flex-grow">
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>Все функции PRO</span></li>
                         <li className="flex items-center gap-2"><Users className="h-5 w-5 text-success" /><span>от 3 до 24 сотрудников</span></li>
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>Интеграция с CRM (API)</span></li>
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>Персональный менеджер</span></li>
                      </ul>
                  </PlanCard>
                   <PlanCard plan={plans.enterprise} href="#" onCtaClick={handleCorporateClick} isDisabled={employeeCount < 25}>
                       <ul className="space-y-3 text-muted-foreground flex-grow">
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>Все функции BUSINESS</span></li>
                          <li className="flex items-center gap-2"><Infinity className="h-5 w-5 text-success" /><span>от 25 сотрудников</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>White Label и свой домен</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><span>Развертывание On-premise</span></li>
                      </ul>
                  </PlanCard>
                </div>

                <FeatureComparisonTable />
            </div>
        </section>
        </>
    );
};

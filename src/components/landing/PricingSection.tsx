// @ts-nocheck
// src/components/landing/PricingSection.tsx
"use client";

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Infinity, XCircle } from 'lucide-react';
import { CtaButton } from './CtaButton';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { Input } from '../ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const PlanCard = ({ plan, popular, pro, children, href, onCtaClick, isDisabled = false }: { plan: any, popular?: boolean, pro?: boolean, children: React.ReactNode, href: string, onCtaClick?: (e: React.MouseEvent<HTMLButtonElement>) => void, isDisabled?: boolean }) => (
    <GlassCard className={cn("flex flex-col", popular && "border-2 border-primary/50", isDisabled && "opacity-50 grayscale")}>
        <div className="flex flex-col flex-grow">
            <div>
                <h3 className="text-xl font-bold text-foreground flex items-center justify-between">
                    <span>{plan.name}</span>
                    {popular && <Badge>Популярный</Badge>}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                
                 <div className={cn("my-4 text-foreground text-4xl font-semibold", plan.name === "Тариф ENTERPRISE" && "text-3xl")}>
                    {plan.price}
                    {plan.price_suffix && <span className="text-lg font-normal text-muted-foreground">{plan.price_suffix}</span>}
                </div>
                 {plan.totalPrice !== undefined && (
                     <div className="mt-2 text-center">
                        <p className="text-xs text-muted-foreground">ИТОГО в мес:</p>
                        <p className="font-bold text-lg">{plan.totalPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</p>
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
    <div className="mt-8">
        <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">Сравнение функций</AccordionTrigger>
                <AccordionContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">Функция</TableHead>
                                    <TableHead className="text-center">Free</TableHead>
                                    <TableHead className="text-center">PRO</TableHead>
                                    <TableHead className="text-center">Business</TableHead>
                                    <TableHead className="text-center">Enterprise</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {featureList.map(({ feature, free, pro, business, enterprise }) => (
                                    <TableRow key={feature}>
                                        <TableCell className="font-medium">{feature}</TableCell>
                                        {[free, pro, business, enterprise].map((planFeature, i) => (
                                            <TableCell key={i} className="text-center">
                                                {typeof planFeature === 'boolean' ? (
                                                    planFeature ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto opacity-50" />
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
        free: { name: "Тариф FREE", description: "Для знакомства с сервисом и небольших задач.", price: "Бесплатно", cta: "Начать бесплатно" },
        pro: { name: "Тариф PRO", description: "Для профессионалов и регулярной работы.", price: proPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + "₽", price_suffix: "/мес", cta: "Выбрать PRO", totalPrice: proPrice },
        business: { name: "Тариф BUSINESS", description: "Для команд и интеграции с бизнес-процессами.", price: businessPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + "₽", price_suffix: "/польз.", cta: "Оставить заявку", totalPrice: businessPrice * employeeCount },
        enterprise: { name: "Тариф ENTERPRISE", description: "Для крупных компаний и максимальной кастомизации.", price: "Индивидуально", cta: "Запросить Демо" }
    };
    
    return (
        <>
        <LegalEntityRegistrationDialog isOpen={isLegalEntityModalOpen} onClose={() => setIsLegalEntityModalOpen(false)} />
        <RegistrationDialog isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />
        <section id="pricing" className="py-20">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground">Тарифы и цены</h2>
                    <p className="text-muted-foreground mt-2">Выберите план и пополняйте баланс кредитов по мере необходимости.</p>
                     <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                         <div className="flex items-center gap-2">
                             <Label htmlFor="employees">Сотрудников:</Label>
                             <Input 
                                id="employees"
                                type="number"
                                min="1"
                                value={employeeCount}
                                onChange={(e) => setEmployeeCount(Number(e.target.value) || 1)}
                                className="w-20"
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
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Все функции PRO</span></li>
                         <li className="flex items-center gap-2"><Users className="h-5 w-5 text-green-500" /><span>от 3 до 24 сотрудников</span></li>
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Интеграция с CRM (API)</span></li>
                         <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Персональный менеджер</span></li>
                      </ul>
                  </PlanCard>
                   <PlanCard plan={plans.enterprise} href="#" onCtaClick={handleCorporateClick} isDisabled={employeeCount < 25}>
                       <ul className="space-y-3 text-muted-foreground flex-grow">
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Все функции BUSINESS</span></li>
                          <li className="flex items-center gap-2"><Infinity className="h-5 w-5 text-green-500" /><span>от 25 сотрудников</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>White Label и свой домен</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Развертывание On-premise</span></li>
                      </ul>
                  </PlanCard>
                </div>

                <FeatureComparisonTable />
            </div>
        </section>
        </>
    );
};

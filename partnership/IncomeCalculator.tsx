"use client";
import React, { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';

const partnerRates = {
    'Silver': 0.1,
    'Gold': 0.4,
    'Platinum': 0.6
};

const calculateMonthlyIncome = (params: {
    partnerStatus: 'Silver' | 'Gold' | 'Platinum';
    proClients: number;
    businessClients: number;
    avgBusinessUsers: number;
    integrations: number;
    freeClientsBuyingCredits: number;
    attractedPartners: number;
}) => {
    const { partnerStatus, proClients, businessClients, avgBusinessUsers, integrations, freeClientsBuyingCredits, attractedPartners } = params;
    const rate = partnerRates[partnerStatus];
    
    const proIncome = proClients * 2990 * rate;
    const businessUsersTotal = businessClients * avgBusinessUsers;
    const businessIncome = businessUsersTotal * 2000 * rate;
    const integrationIncome = integrations * businessUsersTotal * 5000;
    const freeClientIncome = freeClientsBuyingCredits * 10;
    const subPartnerAvgIncome = 20000;
    const subPartnerIncome = attractedPartners * subPartnerAvgIncome * 0.01;

    return proIncome + businessIncome + integrationIncome + freeClientIncome + subPartnerIncome;
};

export const IncomeCalculator = () => {
    const [partnerStatus, setPartnerStatus] = useState<'Silver' | 'Gold' | 'Platinum'>('Gold');
    const [proClients, setProClients] = useState(20);
    const [businessClients, setBusinessClients] = useState(4);
    const [avgBusinessUsers, setAvgBusinessUsers] = useState(7);
    const [integrations, setIntegrations] = useState(1);
    const [freeClientsBuyingCredits, setFreeClientsBuyingCredits] = useState(40);
    const [attractedPartners, setAttractedPartners] = useState(4);

    const monthlyIncome = useMemo(() => calculateMonthlyIncome({
        partnerStatus, proClients, businessClients, avgBusinessUsers, integrations, freeClientsBuyingCredits, attractedPartners
    }), [partnerStatus, proClients, businessClients, avgBusinessUsers, integrations, freeClientsBuyingCredits, attractedPartners]);

     const cumulativePlan = useMemo(() => {
        const calculateIncomeForPeriod = (multiplier: number) => calculateMonthlyIncome({
            partnerStatus,
            proClients: Math.ceil(proClients * multiplier),
            businessClients: Math.ceil(businessClients * multiplier),
            avgBusinessUsers,
            integrations: Math.ceil(integrations * multiplier),
            freeClientsBuyingCredits: Math.ceil(freeClientsBuyingCredits * multiplier),
            attractedPartners: Math.ceil(attractedPartners * multiplier),
        });
        
        const month1Income = calculateIncomeForPeriod(1/3);
        const month2Income = calculateIncomeForPeriod(2/3); 
        const month3Income = calculateIncomeForPeriod(1);

        return [
            { month: 1, income: month1Income, cumulative: month1Income },
            { month: 2, income: month2Income - month1Income, cumulative: month2Income },
            { month: 3, income: month3Income - month2Income, cumulative: month3Income },
        ];
    }, [partnerStatus, proClients, businessClients, avgBusinessUsers, integrations, freeClientsBuyingCredits, attractedPartners]);

    return (
         <section className="py-20" id="income-calculator">
            <div className="container mx-auto">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground">Калькулятор дохода</h2>
                    <p className="text-muted-foreground mt-2">Смоделируйте свой ежемесячный доход, изменяя параметры</p>
                </div>
                <GlassCard gradient="purple">
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                             <div>
                                <Label>Ваш партнерский статус</Label>
                                <Select value={partnerStatus} onValueChange={(v: any) => setPartnerStatus(v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Silver">Серебряный (10%)</SelectItem>
                                        <SelectItem value="Gold">Золотой (40%)</SelectItem>
                                        <SelectItem value="Platinum">Платиновый (60%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label>PRO клиенты ({proClients})</Label><Slider value={[proClients]} onValueChange={(v) => setProClients(v[0])} max={100} step={1} /></div>
                            <div><Label>BUSINESS компании ({businessClients})</Label><Slider value={[businessClients]} onValueChange={(v) => setBusinessClients(v[0])} max={20} step={1} /></div>
                            <div><Label>Среднее кол-во юзеров в BUSINESS ({avgBusinessUsers})</Label><Slider value={[avgBusinessUsers]} onValueChange={(v) => setAvgBusinessUsers(v[0])} max={25} step={1} /></div>
                            <div><Label>Интеграции для BUSINESS ({integrations})</Label><Slider value={[integrations]} onValueChange={(v) => setIntegrations(v[0])} max={10} step={1} /></div>
                            <div><Label>FREE клиенты с покупкой кредитов ({freeClientsBuyingCredits})</Label><Slider value={[freeClientsBuyingCredits]} onValueChange={(v) => setFreeClientsBuyingCredits(v[0])} max={100} step={5} /></div>
                            <div><Label>Привлечено партнеров 2-го уровня ({attractedPartners})</Label><Slider value={[attractedPartners]} onValueChange={(v) => setAttractedPartners(v[0])} max={20} step={1} /></div>
                        </div>
                        <div className="p-4 rounded-lg bg-background/50">
                             <p className="text-muted-foreground text-center">Ваш потенциальный доход в месяц:</p>
                             <p className="text-5xl md:text-6xl font-extrabold my-2 text-center bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-400 bg-clip-text text-transparent">
                                {monthlyIncome.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </p>
                             <div className="mt-8 p-4 border border-dashed rounded-lg">
                                <h4 className="font-semibold text-center text-lg flex items-center justify-center gap-2"><Target/>Накопительный итог за 3 месяца:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-4">
                                    {cumulativePlan.map(p => (
                                        <div key={p.month}>
                                            <Badge>Месяц {p.month}</Badge>
                                            <p className="font-bold mt-1 text-lg">{p.cumulative.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </section>
    );
};

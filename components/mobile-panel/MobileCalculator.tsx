// src/components/mobile-panel/MobileCalculator.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext, type HistoryRequest, type SpecificationItem } from '@/contexts/AppContext';

const recommendedValues = {
    normDevicesPerShift: 24,
    normCablePerShift: 50,
    shiftCost: 3004,
    infraCost: 3996,
    marginPercent: 60,
    complexityMultiplier: 1.1,
};

interface MobileCalculatorProps {
    project: HistoryRequest | null;
    onSmrCostChange: (cost: number) => void;
}

export function MobileCalculator({ project, onSmrCostChange }: MobileCalculatorProps) {
    const { user, effectivePlan } = useAppContext();
    
    type CalculatorMode = 'simple' | 'advanced';
    type CostCalculationMethod = 'perShift' | 'perMonth';

    const [inputValues, setInputValues] = useState({
        ...recommendedValues,
        costCalculationMethod: 'perShift' as CostCalculationMethod,
        monthlySalary: 65000,
        mode: 'simple' as CalculatorMode,
    });
    
    const isPro = effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise';

    useEffect(() => {
        if (project?.analysisDetails?.maxInstallationHeight) {
            const heightStr = project.analysisDetails.maxInstallationHeight;
            if (heightStr.includes('6')) setInputValues(prev => ({ ...prev, complexityMultiplier: 1.2 }));
            else if (heightStr.includes('4')) setInputValues(prev => ({ ...prev, complexityMultiplier: 1.1 }));
        }
    }, [project]);

    const { devicesCount, cableMeters } = useMemo(() => {
        if (!project) return { devicesCount: 0, cableMeters: 0 };
        let devices = 0;
        let cable = 0;
        project.outputSpecifications.forEach((item: SpecificationItem) => {
            if (item.isInformational) return;
            if (item.itemType === 'device') devices += item.quantityToInstall || 0;
            if (item.itemType === 'cable') cable += item.quantityToInstall || 0;
        });
        return { devicesCount: devices, cableMeters: cable };
    }, [project]);

    const calculatedShiftCost = useMemo(() => (inputValues.costCalculationMethod === 'perMonth')
        ? parseFloat((Number(inputValues.monthlySalary) / 22).toFixed(2))
        : Number(inputValues.shiftCost),
        [inputValues.costCalculationMethod, inputValues.monthlySalary, inputValues.shiftCost]
    );

    const { totalInstallationCost: recommendedSmrCost } = useMemo(() => {
        const { normDevicesPerShift, normCablePerShift, infraCost, marginPercent, complexityMultiplier } = inputValues;
        const deviceShifts = normDevicesPerShift > 0 ? devicesCount / normDevicesPerShift : 0;
        const cableShifts = normCablePerShift > 0 ? cableMeters / normCablePerShift : 0;
        const totalShifts = deviceShifts + cableShifts;
        const totalInstallationCost = totalShifts * (calculatedShiftCost + infraCost) * (1 + marginPercent / 100) * complexityMultiplier;
        return { totalInstallationCost };
    }, [inputValues, devicesCount, cableMeters, calculatedShiftCost]);
    
    useEffect(() => {
        onSmrCostChange(recommendedSmrCost);
    }, [recommendedSmrCost, onSmrCostChange]);

    const handleInputChange = (field: keyof typeof inputValues, value: string | number | boolean) => {
        const numericFields = new Set(['normDevicesPerShift', 'normCablePerShift', 'shiftCost', 'infraCost', 'marginPercent', 'monthlySalary']);
        const finalValue = numericFields.has(field as string) ? Number(value) : value;
        setInputValues(prev => ({ ...prev, [field]: finalValue }));
    };
    
    const handleSliderChange = (value: number[]) => handleInputChange('complexityMultiplier', 1 + value[0] / 100);

    const handleModeSwitch = (checked: boolean) => {
        const newMode = checked ? 'advanced' : 'simple';
        if (newMode === 'advanced' && !isPro) {
            // Here you might want to trigger a modal, for now, we just prevent the switch.
            return;
        }
        setInputValues(prev => ({...prev, mode: newMode}));
    };

    return (
        <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
                <p className="font-semibold">Расчет стоимости СМР</p>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="calc-mode-switch">Продвинутый</Label>
                    <Switch id="calc-mode-switch" checked={inputValues.mode === 'advanced'} onCheckedChange={handleModeSwitch} />
                    {!isPro && <Star className="h-4 w-4 text-amber-500"/>}
                </div>
            </div>
            
            <div className="space-y-2">
                <Label>Коэффициент сложности</Label>
                <div className="flex items-center gap-4">
                    <Slider value={[(inputValues.complexityMultiplier - 1) * 100]} max={100} step={5} onValueChange={handleSliderChange} />
                    <span className="font-bold w-16 text-right">x{inputValues.complexityMultiplier.toFixed(2)}</span>
                </div>
            </div>

            {inputValues.mode === 'advanced' && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Приборов/смена</Label><Input type="number" value={inputValues.normDevicesPerShift} onChange={e => handleInputChange('normDevicesPerShift', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Кабеля/смена, м</Label><Input type="number" value={inputValues.normCablePerShift} onChange={e => handleInputChange('normCablePerShift', e.target.value)} /></div>
                    </div>
                     <RadioGroup value={inputValues.costCalculationMethod} onValueChange={(v) => handleInputChange('costCalculationMethod', v)} className="flex pt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="perShift"/><Label>Ставка</Label></div><div className="flex items-center space-x-2 ml-4"><RadioGroupItem value="perMonth"/><Label>Оклад</Label></div></RadioGroup>
                    {inputValues.costCalculationMethod === 'perShift' ? (
                        <div className="space-y-2"><Label>Ставка за смену, ₽</Label><Input type="number" value={inputValues.shiftCost} onChange={e => handleInputChange('shiftCost', e.target.value)} /></div>
                    ) : (
                        <div className="space-y-2"><Label>Оклад в месяц (брутто), ₽</Label><Input type="number" value={inputValues.monthlySalary} onChange={e => handleInputChange('monthlySalary', e.target.value)} /></div>
                    )}
                    <div className="space-y-2"><Label>Инфраструктура/смена, ₽</Label><Input type="number" value={inputValues.infraCost} onChange={e => handleInputChange('infraCost', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Маржа, %</Label><Input type="number" value={inputValues.marginPercent} onChange={e => handleInputChange('marginPercent', e.target.value)} /></div>
                </div>
            )}
        </div>
    );
}

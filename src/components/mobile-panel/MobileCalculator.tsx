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
    normCableSupportPerShift: 35,
    shiftCost: 3004,
    infraCost: 3996,
    marginPercent: 60,
    complexityMultiplier: 1.1,
};

const COMPLEXITY_MIN = 0.5;
const COMPLEXITY_MAX = 10;

const complexityPresets: Array<{ label: string; value: number }> = [
    { label: 'До 3м', value: 1.0 },
    { label: '4-6м', value: 1.2 },
    { label: '6-10м', value: 1.4 },
    { label: 'Сложно', value: 1.8 },
    { label: '>10м', value: 2.2 },
];

const clampComplexity = (value: number) => {
    if (!Number.isFinite(value)) return recommendedValues.complexityMultiplier;
    return Math.min(COMPLEXITY_MAX, Math.max(COMPLEXITY_MIN, value));
};

const getRecommendedComplexityByHeight = (heightRaw?: string | null) => {
    if (!heightRaw) return null;
    const match = heightRaw.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return null;
    const height = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(height)) return null;
    if (height <= 3) return 1.0;
    if (height <= 6) return 1.2;
    if (height <= 10) return 1.4;
    return 1.8;
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
        const recommendedByHeight = getRecommendedComplexityByHeight(project?.analysisDetails?.maxInstallationHeight);
        if (recommendedByHeight) {
            setInputValues(prev => ({ ...prev, complexityMultiplier: clampComplexity(recommendedByHeight) }));
        }
    }, [project]);

    const { devicesCount, cableMeters, cableSupportMeters } = useMemo(() => {
        if (!project) return { devicesCount: 0, cableMeters: 0, cableSupportMeters: 0 };
        let devices = 0;
        let cable = 0;
        let cableSupport = 0;
        project.outputSpecifications.forEach((item: SpecificationItem) => {
            if (item.isInformational) return;
            if (item.itemType === 'device') devices += item.quantityToInstall || 0;
            if (item.itemType === 'cable') cable += item.quantityToInstall || 0;
            if (item.itemType === 'cable_support') cableSupport += item.quantityToInstall || 0;
        });
        return { devicesCount: devices, cableMeters: cable, cableSupportMeters: cableSupport };
    }, [project]);

    const calculatedShiftCost = useMemo(() => (inputValues.costCalculationMethod === 'perMonth')
        ? parseFloat((Number(inputValues.monthlySalary) / 22).toFixed(2))
        : Number(inputValues.shiftCost),
        [inputValues.costCalculationMethod, inputValues.monthlySalary, inputValues.shiftCost]
    );

    const { totalInstallationCost: recommendedSmrCost } = useMemo(() => {
        const { normDevicesPerShift, normCablePerShift, normCableSupportPerShift, infraCost, marginPercent, complexityMultiplier } = inputValues;
        const deviceShifts = normDevicesPerShift > 0 ? devicesCount / normDevicesPerShift : 0;
        const cableShifts = normCablePerShift > 0 ? cableMeters / normCablePerShift : 0;
        const cableSupportShifts = normCableSupportPerShift > 0 ? cableSupportMeters / normCableSupportPerShift : 0;
        const totalShifts = deviceShifts + cableShifts + cableSupportShifts;
        const totalInstallationCost = totalShifts * (calculatedShiftCost + infraCost) * (1 + marginPercent / 100) * complexityMultiplier;
        return { totalInstallationCost };
    }, [inputValues, devicesCount, cableMeters, cableSupportMeters, calculatedShiftCost]);
    
    useEffect(() => {
        onSmrCostChange(recommendedSmrCost);
    }, [recommendedSmrCost, onSmrCostChange]);

    const handleInputChange = (field: keyof typeof inputValues, value: string | number | boolean) => {
        const numericFields = new Set(['normDevicesPerShift', 'normCablePerShift', 'normCableSupportPerShift', 'shiftCost', 'infraCost', 'marginPercent', 'monthlySalary']);
        let finalValue = numericFields.has(field as string) ? Number(value) : value;
        if (field === 'complexityMultiplier' && typeof finalValue === 'number') {
            finalValue = clampComplexity(finalValue);
        }
        setInputValues(prev => ({ ...prev, [field]: finalValue }));
    };
    
    const handleSliderChange = (value: number[]) => handleInputChange('complexityMultiplier', value[0]);
    const handlePresetClick = (value: number) => handleInputChange('complexityMultiplier', value);

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
                <p className="font-semibold">Рассчитать СМР</p>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="calc-mode-switch" className="text-xs">PRO</Label>
                    <Switch id="calc-mode-switch" checked={inputValues.mode === 'advanced'} onCheckedChange={handleModeSwitch} />
                    {!isPro && <Star className="h-4 w-4 text-amber-500"/>}
                </div>
            </div>
            
            <div className="space-y-2">
                <Label>Коэффициент сложности</Label>
                <div className="flex items-center gap-4">
                    <Slider value={[inputValues.complexityMultiplier]} min={COMPLEXITY_MIN} max={COMPLEXITY_MAX} step={0.1} onValueChange={handleSliderChange} />
                    <span className="font-bold w-16 text-right">x{inputValues.complexityMultiplier.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {complexityPresets.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            className={cn(
                                "rounded-md border px-2 py-1 text-xs",
                                Math.abs(inputValues.complexityMultiplier - preset.value) < 0.01
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground"
                            )}
                            onClick={() => handlePresetClick(preset.value)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {inputValues.mode === 'advanced' && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Приборов/смена</Label><Input type="number" value={inputValues.normDevicesPerShift} onChange={e => handleInputChange('normDevicesPerShift', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Кабеля/смена, м</Label><Input type="number" value={inputValues.normCablePerShift} onChange={e => handleInputChange('normCablePerShift', e.target.value)} /></div>
                        <div className="space-y-2 sm:col-span-2"><Label>КК/смена, м</Label><Input type="number" value={inputValues.normCableSupportPerShift} onChange={e => handleInputChange('normCableSupportPerShift', e.target.value)} /></div>
                    </div>
                     <RadioGroup value={inputValues.costCalculationMethod} onValueChange={(v) => handleInputChange('costCalculationMethod', v)} className="flex flex-wrap gap-3 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="perShift"/><Label>Ставка</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="perMonth"/><Label>Оклад</Label></div>
                     </RadioGroup>
                    {inputValues.costCalculationMethod === 'perShift' ? (
                        <div className="space-y-2"><Label>Ставка/смену, ₽</Label><Input type="number" value={inputValues.shiftCost} onChange={e => handleInputChange('shiftCost', e.target.value)} /></div>
                    ) : (
                        <div className="space-y-2"><Label>Оклад/мес, ₽</Label><Input type="number" value={inputValues.monthlySalary} onChange={e => handleInputChange('monthlySalary', e.target.value)} /></div>
                    )}
                    <div className="space-y-2"><Label>Инфра/смена, ₽</Label><Input type="number" value={inputValues.infraCost} onChange={e => handleInputChange('infraCost', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Маржа, %</Label><Input type="number" value={inputValues.marginPercent} onChange={e => handleInputChange('marginPercent', e.target.value)} /></div>
                </div>
            )}
        </div>
    );
}

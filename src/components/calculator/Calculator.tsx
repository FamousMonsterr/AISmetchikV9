// @ts-nocheck
// src/components/calculator/Calculator.tsx
"use client";

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, BadgeDollarSign, Undo2, Star, Database, Bot, Pencil, Coins, RotateCcw, Download, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAppContext, type HistoryRequest, UserPlan, SpecificationItem } from '@/contexts/AppContext';
import { PrivatePriceDialog } from '@/components/PrivatePriceDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { calculateProjectTotals } from '@/lib/calculation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { generateJson } from '@/services/ai';
import { generateDocx } from '@/services/docxGenerator';
import { generateExcel } from '@/services/excelGenerator';
import DocumentTemplate from '../pdf/DocumentTemplate';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { sendFileToTelegramUser } from '@/actions/telegramActions';


const recommendedValues = {
    normDevicesPerShift: 24,
    normCablePerShift: 50, // Renamed from normTracePerShift
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
    { label: 'Сложный доступ', value: 1.8 },
    { label: 'Высотные >10м', value: 2.2 },
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

interface CalculatorProps {
    initialProjectData?: HistoryRequest | null;
    calculatedDevices: number;
    calculatedCable: number; // Renamed
    calculatedCableSupport: number;
    onProFeatureClick: () => void;
    onApplyPricesFromPrivateBase: () => void;
    onSmrCostChange: (cost: number) => void; // Callback to notify parent of cost changes
    externalUpdates?: {
        manualSmrCost?: number | null;
        complexityMultiplier?: number | null;
    } | null;
    onExternalUpdatesApplied?: () => void;
    onComplexityChange?: (value: number) => void;
}

// Helper function to convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to base64.'));
          }
        };
        reader.onerror = (error) => reject(error);
    });
}

type FileFormat = 'pdf' | 'docx' | 'xlsx';


export function Calculator(props: CalculatorProps) {
    const {
        initialProjectData,
        calculatedDevices,
        calculatedCable,
        calculatedCableSupport,
        onProFeatureClick,
        onApplyPricesFromPrivateBase,
        onSmrCostChange,
        externalUpdates,
        onExternalUpdatesApplied,
        onComplexityChange,
    } = props;
    const { toast } = useToast();
    const { user, currentProject, setCurrentProject, effectivePlan, logAction, companies } = useAppContext();
    const [isAdjustCostDialogOpen, setIsAdjustCostDialogOpen] = useState(false);
    
    type CalculatorMode = 'simple' | 'advanced';
    type CostCalculationMethod = 'perShift' | 'perMonth';
    
    const numericFields = new Set([
        'normDevicesPerShift', 'normCablePerShift', 'normCableSupportPerShift',
        'shiftCost', 'infraCost', 'marginPercent', 'bargainPercent', 'unforeseenPercent',
        'complexityMultiplier', 'pnrValue', 'agencyPercent', 'discountValue', 'monthlySalary',
    ]);
    
    const [inputValues, setInputValues] = useState({
        ...recommendedValues,
        costCalculationMethod: 'perShift' as CostCalculationMethod,
        monthlySalary: 65000,
        mode: 'simple' as CalculatorMode, // Add mode to state
    });
    
    const isPro = effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise';

    useEffect(() => {
        const recommendedByHeight = getRecommendedComplexityByHeight(initialProjectData?.analysisDetails?.maxInstallationHeight);
        if (recommendedByHeight) {
            setInputValues(prev => ({ ...prev, complexityMultiplier: clampComplexity(recommendedByHeight) }));
        }
    }, [initialProjectData]);

    const calculatedShiftCost = useMemo(() => (inputValues.costCalculationMethod === 'perMonth')
        ? parseFloat((Number(inputValues.monthlySalary) / 22).toFixed(2))
        : Number(inputValues.shiftCost),
        [inputValues.costCalculationMethod, inputValues.monthlySalary, inputValues.shiftCost]
    );

    const { totalInstallationCost: recommendedSmrCost } = useMemo(() => {
        const { normDevicesPerShift, normCablePerShift, normCableSupportPerShift, infraCost, marginPercent, complexityMultiplier } = inputValues;
        const deviceShifts = normDevicesPerShift > 0 ? calculatedDevices / normDevicesPerShift : 0;
        const cableShifts = normCablePerShift > 0 ? calculatedCable / normCablePerShift : 0;
        const cableSupportShifts = normCableSupportPerShift > 0 ? calculatedCableSupport / normCableSupportPerShift : 0;
        const totalShifts = deviceShifts + cableShifts + cableSupportShifts;
        const totalInstallationCost = totalShifts * (calculatedShiftCost + infraCost) * (1 + marginPercent / 100) * complexityMultiplier;
        return { totalInstallationCost };
    }, [inputValues, calculatedDevices, calculatedCable, calculatedCableSupport, calculatedShiftCost]);

    const [manualSmrCost, setManualSmrCost] = useState<number | null>(null);
    const [desiredTotalInput, setDesiredTotalInput] = useState<string>('');

    useEffect(() => {
        if (!externalUpdates) return;
        if (Object.prototype.hasOwnProperty.call(externalUpdates, 'manualSmrCost')) {
            setManualSmrCost(externalUpdates.manualSmrCost ?? null);
        }
        if (typeof externalUpdates.complexityMultiplier === 'number') {
            const normalizedComplexity = clampComplexity(externalUpdates.complexityMultiplier as number);
            setInputValues(prev => ({ ...prev, complexityMultiplier: normalizedComplexity }));
            onComplexityChange?.(normalizedComplexity);
        }
        onExternalUpdatesApplied?.();
    }, [externalUpdates, onExternalUpdatesApplied, onComplexityChange]);

    const displaySmrCost = manualSmrCost ?? recommendedSmrCost;
    const isCostOverridden = manualSmrCost !== null;

    useEffect(() => {
        setDesiredTotalInput(displaySmrCost.toFixed(2));
        if (onSmrCostChange) {
            onSmrCostChange(displaySmrCost); // Notify parent on change
        }
    }, [displaySmrCost, onSmrCostChange]);

    const handleAdjustCostConfirm = () => {
        const newTotal = parseFloat(desiredTotalInput);
        if (!isNaN(newTotal) && newTotal >= 0) {
            setManualSmrCost(newTotal);
            setIsAdjustCostDialogOpen(false);
            toast({
                title: "Цена СМР обновлена",
                description: `Новая базовая стоимость монтажных работ установлена: ${newTotal.toLocaleString('ru-RU')} ₽.`,
            });
        } else {
            toast({ title: "Ошибка", description: "Введите корректное число.", variant: "destructive"});
        }
    };
    
    const handleRevertToRecommended = () => {
        setManualSmrCost(null);
        toast({ title: "Возврат к рекомендованной цене", description: "Стоимость СМР сброшена к автоматически рассчитанной." });
    };

    const handleInputChange = (field: keyof typeof inputValues, value: string | number | boolean) => {
        let finalValue = numericFields.has(field) ? Number(value) : value;
        if (field === 'complexityMultiplier' && typeof finalValue === 'number') {
            finalValue = clampComplexity(finalValue);
        }
        setInputValues(prev => ({ ...prev, [field]: finalValue }));
        if (field === 'complexityMultiplier' && typeof finalValue === 'number') {
            onComplexityChange?.(finalValue);
        }
    };
    
    const handleSliderChange = (value: number[]) => handleInputChange('complexityMultiplier', value[0]);
    const handlePresetClick = (value: number) => handleInputChange('complexityMultiplier', value);

    const handleModeSwitch = (checked: boolean) => {
        const newMode = checked ? 'advanced' : 'simple';
        if (newMode === 'advanced' && !isPro) {
            onProFeatureClick();
            return;
        }
        setInputValues(prev => ({...prev, mode: newMode}));
    };

    return (
        <AccordionItem value="calculator">
        <Dialog open={isAdjustCostDialogOpen} onOpenChange={setIsAdjustCostDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Корректировка базовой цены СМР</DialogTitle>
                        <DialogDescription>
                            Введите новую желаемую стоимость. Итоговая цена монтажных работ будет установлена на это значение.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="desired-total-input">Желаемая цена СМР</Label>
                        <Input
                            id="desired-total-input"
                            type="number"
                            value={desiredTotalInput}
                            onChange={(e) => setDesiredTotalInput(e.target.value)}
                            placeholder="Введите новую сумму"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustCostDialogOpen(false)}>Отмена</Button>
                        <Button onClick={handleAdjustCostConfirm}>
                             <Coins className="mr-2 h-4 w-4" />
                            Применить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        
            <div className="p-4 flex justify-between items-center w-full">
                <AccordionTrigger className="p-0 hover:no-underline flex-1">
                    <CardTitle>Калькулятор стоимости</CardTitle>
                </AccordionTrigger>
                <div className="text-right ml-4 text-center">
                    <p className="text-xs text-muted-foreground">Базовая цена СМР</p>
                    <div className="flex items-center gap-1 justify-center">
                        <TooltipProvider>
                            {isCostOverridden && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleRevertToRecommended(); }}>
                                            <RotateCcw className="h-4 w-4 text-muted-foreground"/>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Вернуться к рекомендованной</p></TooltipContent>
                                </Tooltip>
                            )}
                            <p className={cn("font-bold text-lg", isCostOverridden && "text-primary")}>{displaySmrCost.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <button
                                        className={cn("h-6 w-6 flex items-center justify-center relative rounded-full hover:bg-muted", isPro && "text-amber-700")}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isPro) {
                                                setIsAdjustCostDialogOpen(true);
                                            } else {
                                                onProFeatureClick();
                                            }
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {!isPro && <Star className="absolute h-3 w-3 -top-1 -right-1 text-amber-500 fill-amber-400" />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><p>{isPro ? "Задать цену вручную" : "Задать цену вручную (PRO)"}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
            <AccordionContent className="p-4 pt-0">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Label>Простой</Label>
                            <Switch checked={inputValues.mode === 'advanced'} onCheckedChange={handleModeSwitch} />
                            <Label className={cn("flex items-center gap-1", !isPro && "text-muted-foreground")}>
                                {isPro ? "Продвинутый" : "Продвинутый (PRO)"}
                                {!isPro && <Star className="h-4 w-4 text-amber-500"/>}
                            </Label>
                        </div>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader><CardTitle>1. Входные объемы (автоматически)</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Количество приборов</Label><Input value={calculatedDevices} readOnly disabled/></div>
                        <div className="space-y-2"><Label>Метры кабеля</Label><Input value={calculatedCable} readOnly disabled/></div>
                        <div className="space-y-2"><Label>Метры кабеленесущей конструкции</Label><Input value={calculatedCableSupport} readOnly disabled/></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>2. Коэффициент сложности</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Slider value={[inputValues.complexityMultiplier]} min={COMPLEXITY_MIN} max={COMPLEXITY_MAX} step={0.1} onValueChange={handleSliderChange} />
                            <span className="font-bold text-lg w-24 text-right">x{inputValues.complexityMultiplier.toFixed(2)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {complexityPresets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    type="button"
                                    variant={Math.abs(inputValues.complexityMultiplier - preset.value) < 0.01 ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePresetClick(preset.value)}
                                >
                                    {preset.label} · x{preset.value.toFixed(1)}
                                </Button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Диапазон: x0.5 - x10.0. Выберите пресет или настройте точное значение ползунком.</p>
                    </CardContent>
                </Card>
                {inputValues.mode === 'advanced' && (
                    <>
                        <Card>
                            <CardHeader><CardTitle>3. Нормы и ставки</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <fieldset className="space-y-4 p-4 border rounded-md"><legend className="text-sm font-medium -ml-1 px-1">Нормы выработки</legend><div className="space-y-2"><Label>Приборов в смену</Label><Input type="number" value={inputValues.normDevicesPerShift} onChange={e => handleInputChange('normDevicesPerShift', e.target.value)} /></div><div className="space-y-2"><Label>Кабеля в смену, м</Label><Input type="number" value={inputValues.normCablePerShift} onChange={e => handleInputChange('normCablePerShift', e.target.value)} /></div><div className="space-y-2"><Label>Кабеленесущих конструкций в смену, м</Label><Input type="number" value={inputValues.normCableSupportPerShift} onChange={e => handleInputChange('normCableSupportPerShift', e.target.value)} /></div></fieldset>
                                <fieldset className="space-y-4 p-4 border rounded-md"><legend className="text-sm font-medium -ml-1 px-1">Стоимость смены</legend><RadioGroup value={inputValues.costCalculationMethod} onValueChange={(v) => handleInputChange('costCalculationMethod', v)} className="mb-2"><div className="flex items-center space-x-2"><RadioGroupItem value="perShift"/><Label>Ставка за смену</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="perMonth"/><Label>Оклад в месяц</Label></div></RadioGroup>{inputValues.costCalculationMethod === 'perShift' ? (<div className="space-y-2"><Label>Ставка за смену</Label><Input type="number" value={inputValues.shiftCost} onChange={e => handleInputChange('shiftCost', e.target.value)} /></div>) : (<div className="space-y-2"><Label>Оклад в месяц (брутто)</Label><Input type="number" value={inputValues.monthlySalary} onChange={e => handleInputChange('monthlySalary', e.target.value)} /></div>)}<div className="space-y-2"><Label>Инфраструктурный коэф.</Label><Input type="number" value={inputValues.infraCost} onChange={e => handleInputChange('infraCost', e.target.value)} /></div></fieldset>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>4. Коммерческие условия</CardTitle></CardHeader>
                            <CardContent><div className="space-y-2 w-1/2"><Label>Маржа, %</Label><Input type="number" value={inputValues.marginPercent} onChange={e => handleInputChange('marginPercent', e.target.value)} /></div></CardContent>
                        </Card>
                    </>
                )}
            </div>
            </AccordionContent>
        </AccordionItem>
    );
}

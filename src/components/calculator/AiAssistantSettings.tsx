
// src/components/specification/AiAssistantSettings.tsx
"use client";

import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Star, Thermometer, Info } from "lucide-react";
import aiConfig from '@/lib/ai-config.json';
import { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const { apiModels } = aiConfig;

interface AiAssistantSettingsProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    includeThoughts: boolean;
    onThoughtsChange: (checked: boolean) => void;
    onProFeatureClick: () => void;
}

export function AiAssistantSettings({
    selectedModel,
    onModelChange,
    temperature,
    onTemperatureChange,
    includeThoughts,
    onThoughtsChange,
    onProFeatureClick
}: AiAssistantSettingsProps) {
    const { user, effectivePlan } = useAppContext();
    const canUseThoughts = effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise';

    const userAvailableModels = useMemo(() => {
        if (!user || !user.availableModels) return [];
        return apiModels.filter(model => user.availableModels.includes(model.value));
    }, [user]);

    return (
        <AccordionItem value="ai-settings">
            <AccordionTrigger className="p-4"><CardTitle>Настройки AI ассистента</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="ai-model-select">Модель</Label>
                        <Select value={selectedModel} onValueChange={onModelChange}>
                            <SelectTrigger id="ai-model-select">
                                <SelectValue placeholder="Выберите модель..." />
                            </SelectTrigger>
                            <SelectContent>
                                {userAvailableModels.length > 0 ? (
                                    userAvailableModels.map(model => (
                                        <SelectItem key={model.value} value={model.value}>
                                            {model.label} {model.isDefault && '(по умолч.)'}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-models" disabled>Модели не доступны</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Опции</Label>
                         <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="include-thoughts"
                                checked={canUseThoughts && includeThoughts}
                                onCheckedChange={(checked) => canUseThoughts ? onThoughtsChange(checked) : onProFeatureClick()}
                            />
                            <Label htmlFor="include-thoughts" className="font-normal flex items-center gap-1.5 cursor-pointer">
                                Включить "мысли" AI
                                {!canUseThoughts && <Star className="h-4 w-4 text-amber-500" />}
                            </Label>
                        </div>
                    </div>
                </div>
                 <div className="mt-4 space-y-2">
                     <Label htmlFor="temp-slider" className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4"/>
                        <span>Температура (креативность)</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild><button type="button"><Info className="h-4 w-4 text-muted-foreground"/></button></TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><span className="font-bold">0.0 - 0.3</span>: Максимальная точность. Идеально для извлечения данных как есть.</li>
                                        <li><span className="font-bold">0.4 - 0.7</span>: Сбалансированный режим. Подходит для большинства задач, включая анализ и дополнение.</li>
                                        <li><span className="font-bold">0.8+</span>: Креативный режим. Полезен для генерации идей, но может "додумывать" факты.</li>
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                     </Label>
                     <div className="flex items-center gap-2">
                        <Slider
                            id="temp-slider"
                            min={0}
                            max={2}
                            step={0.1}
                            value={[temperature]}
                            onValueChange={(value) => onTemperatureChange(value[0])}
                        />
                        <Input
                            id="temp-input"
                            type="number"
                            className="w-20 text-center"
                            value={temperature}
                            onChange={e => onTemperatureChange(Number(e.target.value))}
                            min="0"
                            max="2"
                            step="0.1"
                        />
                     </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}


// src/components/specification/AiAssistantSettings.tsx
"use client";

import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { PlanBadge } from '@/components/PlanBadge';
import { PlanModelPreference } from '@/components/PlanModelPreference';
import { getModelLabel, getPlanModelOptions, resolvePlanModelId } from '@/lib/plan-models';

interface AiAssistantSettingsProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
    includeThoughts: boolean;
    onThoughtsChange: (checked: boolean) => void;
    onProFeatureClick: () => void;
    onBusinessFeatureClick?: () => void;
}

export function AiAssistantSettings({
    selectedModel,
    onModelChange,
    includeThoughts,
    onThoughtsChange,
    onProFeatureClick,
    onBusinessFeatureClick,
}: AiAssistantSettingsProps) {
    const { user, effectivePlan } = useAppContext();
    const canUseThoughts = effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise';
    const canSelectModel = effectivePlan === 'Business' || effectivePlan === 'Enterprise';

    const planKey = effectivePlan === 'PRO' ? 'pro' : 'free';
    const preference = user?.planModelPreferences?.[planKey];
    const resolvedModel = useMemo(() => resolvePlanModelId(effectivePlan, preference), [effectivePlan, preference]);
    const displayModel = canSelectModel ? selectedModel : resolvedModel;
    const displayLabel = useMemo(() => {
        if (effectivePlan === 'Free') return 'Базовая модель';
        if (effectivePlan === 'PRO') return 'PRO модель';
        return getModelLabel(displayModel) || 'Модель определяется тарифом';
    }, [effectivePlan, displayModel]);
    const planModelOptions = useMemo(() => getPlanModelOptions(effectivePlan), [effectivePlan]);

    return (
        <AccordionItem value="ai-settings">
            <AccordionTrigger className="p-4"><CardTitle>Настройки AI ассистента</CardTitle></AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="ai-model-select">Модель</Label>
                        {canSelectModel ? (
                            <Select value={selectedModel} onValueChange={onModelChange}>
                                <SelectTrigger id="ai-model-select">
                                    <SelectValue placeholder="Выберите модель..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {planModelOptions.length > 0 ? (
                                        planModelOptions.map((model: any) => (
                                            <SelectItem key={model.value} value={model.value}>
                                                {model.label} {model.isDefault && '(по умолч.)'}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="no-models" disabled>Модели не доступны</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <span className="text-muted-foreground">{displayLabel}</span>
                                <PlanBadge plan="Business" size="xs" onClick={onBusinessFeatureClick} />
                            </div>
                        )}
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
                <PlanModelPreference className="mt-4" />
            </AccordionContent>
        </AccordionItem>
    );
}

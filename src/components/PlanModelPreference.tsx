// src/components/PlanModelPreference.tsx
"use client";

import { useMemo, useTransition } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import { getModelLabel, getPlanAbTestModels } from '@/lib/plan-models';
import { updatePlanModelPreference } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PlanModelPreferenceProps {
  className?: string;
}

export function PlanModelPreference({ className }: PlanModelPreferenceProps) {
  const { user, effectivePlan } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const variants = useMemo(() => getPlanAbTestModels(effectivePlan), [effectivePlan]);
  if (!user || variants.length < 2) return null;

  const planKey = effectivePlan === 'PRO' ? 'pro' : 'free';
  const storedValue = user.planModelPreferences?.[planKey] || '';
  const currentValue = variants.includes(storedValue) ? storedValue : '';

  const handleChange = (value: string) => {
    if (!value || value === currentValue) return;
    startTransition(async () => {
      const result = await updatePlanModelPreference({
        userId: user.uid,
        plan: effectivePlan,
        model: value,
      });
      if (!result.success) {
        toast({
          title: "Не удалось сохранить",
          description: result.message || "Попробуйте еще раз.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className={cn("rounded-md border bg-muted/30 p-3 space-y-3", className)}>
      <div className="text-sm font-semibold">A/B тест моделей</div>
      <p className="text-xs text-muted-foreground">
        Мы тестируем несколько моделей для вашего тарифа. Выберите вариант, который нравится больше — это улучшит качество сервиса.
      </p>
      <RadioGroup value={currentValue} onValueChange={handleChange} className="grid gap-2" disabled={isPending}>
        {variants.map((modelId) => (
          <Label
            key={modelId}
            htmlFor={`ab-${modelId}`}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer"
          >
            <RadioGroupItem value={modelId} id={`ab-${modelId}`} />
            {getModelLabel(modelId)}
          </Label>
        ))}
      </RadioGroup>
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Сохраняем выбор...
        </div>
      )}
    </div>
  );
}

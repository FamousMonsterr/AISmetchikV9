'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, FileText } from 'lucide-react';
import type { HubAiEstimate } from '@/types/hub';

interface HubEstimateViewProps {
  estimate: HubAiEstimate;
}

export function HubEstimateView({ estimate }: HubEstimateViewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">AI Смета</CardTitle>
        </div>
        {estimate.summary && (
          <p className="text-sm text-muted-foreground mt-1">{estimate.summary}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Items table */}
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-medium text-muted-foreground px-2 pb-1 border-b">
            <span>Наименование</span>
            <span className="text-right">Кол-во</span>
            <span className="text-right">Цена</span>
            <span className="text-right w-24">Сумма</span>
          </div>
          {estimate.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-sm px-2 py-1">
              <span className="truncate">{item.name}</span>
              <span className="text-right text-muted-foreground">{item.qty} {item.unit}</span>
              <span className="text-right text-muted-foreground">{item.price.toLocaleString('ru-RU')} ₽</span>
              <span className="text-right font-medium w-24">{item.total.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium">Итого (AI рекомендация)</span>
          </div>
          <span className="text-lg font-bold text-primary">
            {estimate.totalCost.toLocaleString('ru-RU')} {estimate.currency === 'RUB' ? '₽' : estimate.currency}
          </span>
        </div>

        {estimate.recommendedBudget && (
          <div className="mt-2 text-sm text-muted-foreground">
            Рекомендуемый диапазон:{' '}
            <span className="font-medium">
              {estimate.recommendedBudget.min.toLocaleString('ru-RU')} – {estimate.recommendedBudget.max.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

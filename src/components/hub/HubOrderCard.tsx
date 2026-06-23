'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, MessageSquare, Eye, Star, Banknote } from 'lucide-react';
import type { HubOrder } from '@/types/hub';
import { HUB_CATEGORIES } from '@/types/hub';

interface HubOrderCardProps {
  order: HubOrder;
  onView: (orderId: string) => void;
  compact?: boolean;
}

const statusLabels: Record<string, { label: string; variant: string }> = {
  open: { label: 'Открыт', variant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  in_progress: { label: 'В работе', variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Завершён', variant: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  cancelled: { label: 'Отменён', variant: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export function HubOrderCard({ order, onView, compact }: HubOrderCardProps) {
  const status = statusLabels[order.status] || statusLabels.open;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onView(order.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {order.title}
          </CardTitle>
          <Badge className={`shrink-0 text-xs ${status.variant}`}>{status.label}</Badge>
        </div>
        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{order.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {order.city}
          </span>
          <span className="flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" />
            {order.budget.min.toLocaleString('ru-RU')} – {order.budget.max.toLocaleString('ru-RU')} ₽
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            до {new Date(order.deadline).toLocaleDateString('ru-RU')}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs font-normal">
              {HUB_CATEGORIES[order.category]}
            </Badge>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {order.responseCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {order.viewCount}
            </span>
          </div>
          {order.userRating !== undefined && order.userRating > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {order.userRating}
            </span>
          )}
        </div>

        {order.aiEstimate && (
          <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-xs text-muted-foreground mb-1">AI рекомендация</div>
            <div className="text-sm font-semibold text-primary">
              {order.aiEstimate.totalCost.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

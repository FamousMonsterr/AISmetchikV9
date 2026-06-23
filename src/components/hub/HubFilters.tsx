'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { HUB_CATEGORIES, type HubCategory, type HubFilters as HubFiltersType } from '@/types/hub';

interface HubFiltersProps {
  filters: HubFiltersType;
  onChange: (filters: HubFiltersType) => void;
  cities?: string[];
}

export function HubFilters({ filters, onChange, cities }: HubFiltersProps) {
  const hasFilters = filters.city || filters.category || filters.budgetMin || filters.budgetMax;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию или описанию..."
          value={filters.query || ''}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.category || '__all__'}
          onValueChange={(v) => onChange({ ...filters, category: v === '__all__' ? undefined : v as HubCategory })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все категории</SelectItem>
            {Object.entries(HUB_CATEGORIES).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.city || '__all__'}
          onValueChange={(v) => onChange({ ...filters, city: v === '__all__' ? undefined : v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Город" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все города</SelectItem>
            {cities?.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy || 'newest'}
          onValueChange={(v) => onChange({ ...filters, sortBy: v as HubFiltersType['sortBy'] })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="budget_asc">Бюджет ↑</SelectItem>
            <SelectItem value="budget_desc">Бюджет ↓</SelectItem>
            <SelectItem value="deadline">По дедлайну</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
        )}
      </div>
    </div>
  );
}

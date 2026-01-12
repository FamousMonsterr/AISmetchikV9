// src/components/specification/SpecificationTable.tsx
"use client";

import { SpecificationRow } from './SpecificationRow';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { SpecificationItem, QuoteConfig } from '@/contexts/AppContext';

interface SpecificationTableProps {
  specifications: SpecificationItem[];
  quoteConfig: QuoteConfig;
  onUpdate: (id: string, updates: Partial<SpecificationItem>) => void;
  onRemove: (id: string) => void;
  onAddItem: () => void;
}

export function SpecificationTable({
  specifications,
  quoteConfig,
  onUpdate,
  onRemove,
  onAddItem
}: SpecificationTableProps) {
    
    return (
        <div className="space-y-3">
             {specifications.length > 0 ? (
                specifications.map((item, index) => (
                    <SpecificationRow
                        key={item.id}
                        item={item}
                        index={index}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        quoteConfig={quoteConfig}
                    />
                ))
            ) : (
                <p className="text-center text-muted-foreground p-8">Спецификация пуста.</p>
            )}
             <div className="pt-4">
                <Button variant="outline" onClick={onAddItem} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Добавить позицию
                </Button>
            </div>
        </div>
    );
}

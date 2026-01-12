// src/components/admin/dialogs/BulkUpdateDialog.tsx
"use client";

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import aiConfig from '@/lib/ai-config.json';
import { UserPlan, SystemRole } from '@/contexts/AppContext';

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { model: string, filterType: 'plan' | 'role', filterValue: string }) => void;
}

export function BulkUpdateDialog({ isOpen, onClose, onConfirm }: BulkUpdateDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [model, setModel] = useState('');
  const [filterType, setFilterType] = useState<'plan' | 'role'>('plan');
  const [filterValue, setFilterValue] = useState('');

  const plans = Object.values(UserPlan);
  const roles = Object.values(SystemRole);

  const handleConfirm = () => {
    if (!model || !filterValue) {
      // Basic validation
      return;
    }
    startTransition(() => {
      onConfirm({ model, filterType, filterValue });
      onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Массовое обновление прав</DialogTitle>
          <DialogDescription>
            Добавьте доступ к AI-модели для группы пользователей.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-select">AI Модель для добавления</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Выберите модель..." />
              </SelectTrigger>
              <SelectContent>
                {aiConfig.apiModels.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <Label htmlFor="filter-type-select">Критерий</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v as any); setFilterValue(''); }}>
                <SelectTrigger id="filter-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Тариф</SelectItem>
                  <SelectItem value="role">Роль</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 min-w-0">
              <Label htmlFor="filter-value-select">Значение</Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger id="filter-value-select">
                  <SelectValue placeholder="Выберите значение..." />
                </SelectTrigger>
                <SelectContent>
                  {filterType === 'plan' ? (
                    plans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)
                  ) : (
                    roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={isPending || !model || !filterValue}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Выполнить обновление
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

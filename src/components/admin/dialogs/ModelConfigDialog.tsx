// src/components/admin/dialogs/ModelConfigDialog.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type PdfEngineOverride = 'none' | 'native' | 'mistral-ocr';

interface ModelConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: { value: string; label: string; provider: 'openrouter'; pdfEngineOverride?: PdfEngineOverride; isDefault?: boolean }, index?: number) => void;
  initialData?: { value: string; label: string; provider: 'openrouter'; pdfEngineOverride?: PdfEngineOverride; isDefault?: boolean };
  editIndex?: number;
}

export function ModelConfigDialog({ isOpen, onClose, onSave, initialData, editIndex }: ModelConfigDialogProps) {
  const [modelId, setModelId] = useState('');
  const [modelLabel, setModelLabel] = useState('');
  const [pdfEngineOverride, setPdfEngineOverride] = useState<PdfEngineOverride>('none');
  const [isDefault, setIsDefault] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const isEditMode = initialData !== undefined && editIndex !== undefined;

  useEffect(() => {
    if (isOpen) {
      setModelId(initialData?.value || '');
      setModelLabel(initialData?.label || '');
      setPdfEngineOverride(initialData?.pdfEngineOverride || 'none');
      setIsDefault(initialData?.isDefault || false);
    } else {
      // Reset form when dialog is closed
      setModelId('');
      setModelLabel('');
      setPdfEngineOverride('none');
      setIsDefault(false);
    }
  }, [isOpen, initialData]);

  const handleConfirm = () => {
    if (!modelId || !modelLabel) {
      toast({
        title: "Ошибка",
        description: "ID модели и отображаемое имя не могут быть пустыми.",
        variant: "destructive",
      });
      return;
    }
    startTransition(() => {
        onSave({ value: modelId, label: modelLabel, provider: 'openrouter', pdfEngineOverride, isDefault }, isEditMode ? editIndex : undefined);
        toast({ title: isEditMode ? "Модель обновлена" : "Модель добавлена" });
        onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Редактировать модель' : 'Добавить новую модель'}</DialogTitle>
          <DialogDescription>
            Введите данные для AI-модели.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">ID Модели</Label>
            <Input
              id="model-id"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="например, openai/gpt-4o-mini"
              disabled={isPending}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="model-label">Отображаемое имя</Label>
            <Input
              id="model-label"
              value={modelLabel}
              onChange={(e) => setModelLabel(e.target.value)}
              placeholder="например, GPT-4o Mini"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-engine-select">Приоритет обработки PDF</Label>
            <Select value={pdfEngineOverride} onValueChange={(v) => setPdfEngineOverride(v as any)} disabled={isPending}>
                <SelectTrigger id="pdf-engine-select">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Авто (глобальная настройка)</SelectItem>
                    <SelectItem value="native">Native (приоритет)</SelectItem>
                    <SelectItem value="mistral-ocr">Mistral OCR (приоритет)</SelectItem>
                </SelectContent>
            </Select>
          </div>
           <div className="flex items-center space-x-2 pt-2">
            <Switch id="is-default-model" checked={isDefault} onCheckedChange={setIsDefault} disabled={isPending} />
            <Label htmlFor="is-default-model" className="flex items-center gap-1.5 cursor-pointer">
                <Star className="h-4 w-4 text-amber-500" />
                Использовать по умолчанию (для тест-драйва)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={isPending || !modelId || !modelLabel}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Сохранить изменения' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

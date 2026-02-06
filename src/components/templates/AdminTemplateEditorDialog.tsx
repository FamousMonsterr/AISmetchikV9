"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocumentTemplate } from '@/actions/documentTemplateActions';

export type AdminTemplateFormValues = {
  name: string;
  description?: string;
  docType: 'proposal' | 'invoice' | 'contract';
  accentColor: string;
  headerStyle: 'standard' | 'compact' | 'modern';
  showSignature: boolean;
  showStamp: boolean;
};

interface AdminTemplateEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: AdminTemplateFormValues) => void;
  isSubmitting?: boolean;
  initialTemplate?: DocumentTemplate | null;
}

const defaultValues: AdminTemplateFormValues = {
  name: '',
  description: '',
  docType: 'proposal',
  accentColor: '#0f172a',
  headerStyle: 'standard',
  showSignature: true,
  showStamp: true,
};

export function AdminTemplateEditorDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialTemplate,
}: AdminTemplateEditorDialogProps) {
  const [values, setValues] = useState<AdminTemplateFormValues>(defaultValues);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTemplate) {
      setValues({
        name: initialTemplate.name || '',
        description: initialTemplate.description || '',
        docType: initialTemplate.docType,
        accentColor: initialTemplate.accentColor || '#0f172a',
        headerStyle: (initialTemplate.headerStyle as AdminTemplateFormValues['headerStyle']) || 'standard',
        showSignature: initialTemplate.showSignature !== false,
        showStamp: initialTemplate.showStamp !== false,
      });
    } else {
      setValues(defaultValues);
    }
  }, [isOpen, initialTemplate]);

  const handleChange = (patch: Partial<AdminTemplateFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = () => {
    if (!values.name.trim()) return;
    onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description?.trim() || '',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialTemplate ? 'Редактирование шаблона' : 'Новый шаблон'}</DialogTitle>
          <DialogDescription>Настройте внешний вид и тип документа.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input value={values.name} onChange={(e) => handleChange({ name: e.target.value })} placeholder="Название шаблона" />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={values.description} onChange={(e) => handleChange({ description: e.target.value })} placeholder="Короткое описание" />
          </div>
          <div className="space-y-2">
            <Label>Тип документа</Label>
            <Select value={values.docType} onValueChange={(value) => handleChange({ docType: value as AdminTemplateFormValues['docType'] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">КП</SelectItem>
                <SelectItem value="invoice">Счет</SelectItem>
                <SelectItem value="contract">Договор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Стиль заголовка</Label>
            <RadioGroup value={values.headerStyle} onValueChange={(value) => handleChange({ headerStyle: value as AdminTemplateFormValues['headerStyle'] })} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'standard', label: 'Стандарт' },
                { value: 'compact', label: 'Компактный' },
                { value: 'modern', label: 'Современный' },
              ].map((option) => (
                <Label key={option.value} className="flex items-center justify-between gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <span className="text-sm">{option.label}</span>
                  <RadioGroupItem value={option.value} />
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Цвет акцента</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={values.accentColor}
                onChange={(e) => handleChange({ accentColor: e.target.value })}
                className="h-10 w-16 p-1"
              />
              <Input
                value={values.accentColor}
                onChange={(e) => handleChange({ accentColor: e.target.value })}
                placeholder="#0f172a"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Подпись</div>
                <div className="text-xs text-muted-foreground">Показывать блок подписи</div>
              </div>
              <Switch checked={values.showSignature} onCheckedChange={(checked) => handleChange({ showSignature: checked })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Печать</div>
                <div className="text-xs text-muted-foreground">Показывать блок печати</div>
              </div>
              <Switch checked={values.showStamp} onCheckedChange={(checked) => handleChange({ showStamp: checked })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !values.name.trim()}>
            {initialTemplate ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

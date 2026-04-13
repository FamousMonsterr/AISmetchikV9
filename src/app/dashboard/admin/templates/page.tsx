// src/app/dashboard/admin/templates/page.tsx
"use client";

import { useMemo, useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { AdminTemplateEditorDialog, type AdminTemplateFormValues } from '@/components/templates/AdminTemplateEditorDialog';
import {
  getDocumentTemplatesBundle,
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
  updateDocumentTemplateSettings,
} from '@/actions/documentTemplateActions';
import { useDocumentTemplates } from '@/hooks/use-document-templates';
import type { DocumentTemplate, DocumentTemplateSettings, DocTemplateKind, UserPlanKey } from '@/actions/documentTemplateActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const docTypes: DocTemplateKind[] = ['proposal', 'invoice', 'contract'];
const planKeys: UserPlanKey[] = ['Free', 'PRO', 'Business', 'Enterprise'];

export default function TemplatesAdminPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  const { templates, settings } = useDocumentTemplates();
  const [localTemplates, setLocalTemplates] = useState<DocumentTemplate[]>([]);
  const [localSettings, setLocalSettings] = useState<DocumentTemplateSettings | null>(null);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const templatesByType = useMemo(() => {
    return docTypes.reduce((acc, type) => {
      acc[type] = localTemplates.filter((tpl) => tpl.docType === type);
      return acc;
    }, {} as Record<DocTemplateKind, DocumentTemplate[]>);
  }, [localTemplates]);

  const refreshTemplates = async () => {
    const result = await getDocumentTemplatesBundle();
    setLocalTemplates(result.templates || []);
    setLocalSettings(result.settings || null);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleSubmitTemplate = (values: AdminTemplateFormValues) => {
    if (!user) return;
    startTransition(async () => {
      const result = editingTemplate
        ? await updateDocumentTemplate({
            adminUserId: user.uid,
            templateId: editingTemplate.id,
            updates: values,
          })
        : await createDocumentTemplate({
            adminUserId: user.uid,
            ...values,
          });
      if (result.success) {
        toast({ title: 'Готово', description: result.message });
        setIsDialogOpen(false);
        await refreshTemplates();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleDeleteTemplate = (template: DocumentTemplate) => {
    if (!user) return;
    const confirmed = window.confirm(`Удалить шаблон "${template.name}"?`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteDocumentTemplate({ adminUserId: user.uid, templateId: template.id });
      if (result.success) {
        toast({ title: 'Удалено', description: result.message });
        await refreshTemplates();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleSettingsChange = (
    plan: UserPlanKey,
    docType: DocTemplateKind,
    templateId: string,
  ) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      defaults: {
        ...localSettings.defaults,
        [plan]: {
          ...localSettings.defaults[plan],
          [docType]: templateId,
        },
      },
    });
  };

  const handleAvailabilityToggle = (
    plan: 'PRO' | 'Business' | 'Enterprise',
    docType: DocTemplateKind,
    templateId: string,
  ) => {
    if (!localSettings) return;
    const current = new Set(localSettings.availability[plan][docType] || []);
    if (current.has(templateId)) {
      current.delete(templateId);
    } else {
      current.add(templateId);
    }
    setLocalSettings({
      ...localSettings,
      availability: {
        ...localSettings.availability,
        [plan]: {
          ...localSettings.availability[plan],
          [docType]: Array.from(current),
        },
      },
    });
  };

  const handleSaveSettings = () => {
    if (!user || !localSettings) return;
    startTransition(async () => {
      const result = await updateDocumentTemplateSettings({
        adminUserId: user.uid,
        settings: localSettings,
      });
      if (result.success) {
        toast({ title: 'Настройки сохранены', description: result.message });
        await refreshTemplates();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Конструктор шаблонов</CardTitle>
            <CardDescription>Создавайте шаблоны для всех пользователей и управляйте доступами по тарифам.</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Новый шаблон
          </Button>
        </CardHeader>
      </Card>

      <Tabs defaultValue="proposal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposal">КП</TabsTrigger>
          <TabsTrigger value="invoice">Счета</TabsTrigger>
          <TabsTrigger value="contract">Договоры</TabsTrigger>
        </TabsList>

        {docTypes.map((kind) => (
          <TabsContent key={kind} value={kind}>
            <ScrollArea className="h-[320px] rounded-md border p-3">
              <div className="grid gap-3 md:grid-cols-2">
                {templatesByType[kind]?.map((tpl) => (
                  <Card key={tpl.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{tpl.name}</CardTitle>
                        <Badge variant="outline">{tpl.docType}</Badge>
                      </div>
                      <CardDescription>{tpl.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(tpl)}>Редактировать</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tpl)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {templatesByType[kind]?.length === 0 && (
                  <div className="text-sm text-muted-foreground">Шаблоны пока не созданы.</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Доступы и стандартные шаблоны</CardTitle>
          <CardDescription>Выберите шаблоны по умолчанию для Free/PRO и доступные шаблоны для PRO/Business/Enterprise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!localSettings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка настроек...
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {planKeys.map((plan) => (
                  <div key={plan} className="space-y-3">
                    <div className="font-semibold">{plan}</div>
                    {docTypes.map((docType) => (
                      <div key={`${plan}-${docType}`} className="space-y-2">
                        <div className="text-xs text-muted-foreground">{docType === 'proposal' ? 'КП' : docType === 'invoice' ? 'Счет' : 'Договор'}</div>
                        <Select
                          value={localSettings.defaults[plan][docType]}
                          onValueChange={(value) => handleSettingsChange(plan, docType, value)}
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите шаблон" />
                          </SelectTrigger>
                          <SelectContent>
                            {templatesByType[docType]?.map((tpl) => (
                              <SelectItem key={`${plan}-${docType}-${tpl.id}`} value={tpl.id}>
                                {tpl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="font-semibold">Доступность шаблонов</div>
                {(['PRO', 'Business', 'Enterprise'] as const).map((plan) => (
                  <Card key={plan} className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">{plan}</CardTitle>
                      <CardDescription>Отметьте шаблоны, доступные пользователям этого тарифа.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      {docTypes.map((docType) => (
                        <div key={`${plan}-${docType}`} className="space-y-2">
                          <div className="text-xs text-muted-foreground">{docType === 'proposal' ? 'КП' : docType === 'invoice' ? 'Счет' : 'Договор'}</div>
                          <div className="space-y-2">
                            {templatesByType[docType]?.map((tpl) => {
                              const isChecked = localSettings.availability[plan][docType]?.includes(tpl.id);
                              return (
                                <label key={`${plan}-${docType}-${tpl.id}`} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={!!isChecked}
                                    onCheckedChange={() => handleAvailabilityToggle(plan, docType, tpl.id)}
                                    disabled={isPending}
                                  />
                                  {tpl.name}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <Button onClick={handleSaveSettings} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Сохранить настройки
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminTemplateEditorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmitTemplate}
        isSubmitting={isPending}
        initialTemplate={editingTemplate}
      />
    </div>
  );
}

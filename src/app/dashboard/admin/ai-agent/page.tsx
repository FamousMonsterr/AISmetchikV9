// src/app/dashboard/admin/ai-agent/page.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Bot, BrainCircuit, Link, Trash2, PlusCircle, DownloadCloud, Info, FileJson, Edit, ChevronsUpDown, FileText, ArrowRight, Sparkles } from "lucide-react";
import { getAiAgentConfig, updateAiAgentConfig, type AiAgentConfig } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ModelConfigDialog } from '@/components/admin/dialogs/ModelConfigDialog';
import { AddModelFromProviderDialog } from '@/components/admin/dialogs/AddModelFromProviderDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import XiaomiProviderPanel from '@/components/admin/XiaomiProviderPanel';


export default function AdminAiAgentPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [config, setConfig] = useState<AiAgentConfig | null>(null);
  const [initialConfigSnapshot, setInitialConfigSnapshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<{ model: any; index: number } | null>(null);
  const [isAddFromProviderDialogOpen, setIsAddFromProviderDialogOpen] = useState(false);
  const loadedForUserRef = useRef<string | null>(null);

  /** Активный провайдер — определяет контекст для диалогов */
  const [activeProvider, setActiveProvider] = useState<string>('openrouter');

  const hasUnsavedChanges = useMemo(() => {
    if (!config) {
      return false;
    }
    return JSON.stringify(config) !== initialConfigSnapshot;
  }, [config, initialConfigSnapshot]);

  useEffect(() => {
    if (!user || user.systemRole !== 'Super Admin') {
      loadedForUserRef.current = null;
      setIsLoading(false);
      return;
    }
    if (loadedForUserRef.current === user.uid) {
      return;
    }

    loadedForUserRef.current = user.uid;
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const currentConfig = await getAiAgentConfig();
        setConfig(currentConfig);
        setInitialConfigSnapshot(JSON.stringify(currentConfig));
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить конфигурацию AI.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [user?.uid, user?.systemRole, toast]);

  const handleCloseModelDialog = useCallback(() => {
    setIsModelDialogOpen(false);
    setModelToEdit(null);
  }, []);

  const handleCloseAddFromProviderDialog = useCallback(() => {
    setIsAddFromProviderDialogOpen(false);
  }, []);

  const handleProviderConfigChange = (providerId: string, key: string, value: any) => {
    setConfig(prev => {
        if (!prev) return null;
        const newProviders = {
            ...prev.providers,
            [providerId]: {
                ...(prev.providers[providerId] || { name: providerId, baseUrl: '' }),
                [key]: value
            }
        };
        return { ...prev, providers: newProviders };
    });
};

const handlePdfPriorityChange = (newOrder: ('native' | 'mistral-ocr' | 'pdf-text')[]) => {
    handleProviderConfigChange('openrouter', 'pdfProcessingPriority', newOrder);
};

const moveEngine = (engine: string, direction: 'up' | 'down') => {
    if (!config?.providers.openrouter.pdfProcessingPriority) return;

    const currentPriority = [...config.providers.openrouter.pdfProcessingPriority];
    const index = currentPriority.indexOf(engine as any);

    if (index === -1) return;
    if (direction === 'up' && index > 0) {
        [currentPriority[index], currentPriority[index - 1]] = [currentPriority[index - 1], currentPriority[index]];
    } else if (direction === 'down' && index < currentPriority.length - 1) {
        [currentPriority[index], currentPriority[index + 1]] = [currentPriority[index + 1], currentPriority[index]];
    }

    handlePdfPriorityChange(currentPriority);
};


  const handleModelConfigChange = (modelIndex: number, key: string, value: any) => {
    setConfig(prev => {
        if (!prev) return null;
        const newApiModels = [...prev.apiModels];
        newApiModels[modelIndex] = { ...newApiModels[modelIndex], [key]: value };
        return { ...prev, apiModels: newApiModels };
    });
  };

  /**
   * Сервисная модель — глобально одна.
   * Привязка по value, а не по индексу, чтобы не сбивалась при перестроении массива.
   */
  const handleSetServiceModel = (modelIndex: number, enabled: boolean) => {
    const modelValue = config?.apiModels[modelIndex]?.value;
    if (!modelValue) return;
    setConfig(prev => {
      if (!prev) return null;
      const newApiModels = prev.apiModels.map((model: any) => ({
        ...model,
        isServiceModel: model.value === modelValue ? enabled : false,
      }));
      return { ...prev, apiModels: newApiModels };
    });
  };

  const handleSetVoiceModel = (modelIndex: number, enabled: boolean) => {
    const modelValue = config?.apiModels[modelIndex]?.value;
    if (!modelValue) return;
    setConfig(prev => {
      if (!prev) return null;
      const newApiModels = prev.apiModels.map((model: any) => ({
        ...model,
        isVoiceModel: model.value === modelValue ? enabled : false,
      }));
      return { ...prev, apiModels: newApiModels };
    });
  };

  const handleSaveModel = (modelData: any, index?: number) => {
    setConfig(prev => {
        if (!prev) return null;
        const newModels = [...prev.apiModels];
        if (index !== undefined) {
            // Editing existing model
            const oldModel = newModels[index];
            newModels[index] = { ...oldModel, ...modelData };
        } else {
            // Adding new model — provider приходит из modelData
            newModels.push({
                ...modelData,
                temperature: 0.2,
                supportsThoughts: false,
                canGenerateImages: false,
                canProcessAudio: false,
            });
        }
        return { ...prev, apiModels: newModels };
    });
  };

  /**
   * Добавление моделей из каталога провайдера.
   * provider берётся из activeProvider (контекст текущего таба).
   */
  const handleAddMultipleModels = (models: { id: string, name: string }[]) => {
      const newModels = models.map(m => ({
          value: m.id,
          label: m.name,
          provider: activeProvider,
          temperature: 0.2,
          supportsThoughts: false,
          canGenerateImages: false,
          canProcessAudio: false,
      }));
       setConfig(prev => prev ? ({
            ...prev,
            apiModels: [...prev.apiModels, ...newModels]
        }) : null);
  };

  const handleRemoveModel = (modelIndex: number) => {
    setConfig(prev => {
        if (!prev) return null;
        const newApiModels = prev.apiModels.filter((_, index) => index !== modelIndex);
        return { ...prev, apiModels: newApiModels };
    });
  };

  const getPlanModels = (current: AiAgentConfig) => ({
    free: current.planModels?.free || {},
    pro: current.planModels?.pro || {},
    business: current.planModels?.business || {},
    enterprise: current.planModels?.enterprise || {},
  });

  const updatePlanModelField = (planKey: 'free' | 'pro' | 'business' | 'enterprise', field: 'defaultModel' | 'abTestModels' | 'availableModels', value: any) => {
    setConfig(prev => {
      if (!prev) return null;
      const planModels = getPlanModels(prev);
      return {
        ...prev,
        planModels: {
          ...planModels,
          [planKey]: {
            ...planModels[planKey],
            [field]: value,
          },
        },
      };
    });
  };

  const togglePlanModelList = (planKey: 'free' | 'pro' | 'business' | 'enterprise', field: 'abTestModels' | 'availableModels', modelId: string) => {
    setConfig(prev => {
      if (!prev) return null;
      const planModels = getPlanModels(prev);
      const currentList = new Set(planModels[planKey]?.[field] || []);
      if (currentList.has(modelId)) {
        currentList.delete(modelId);
      } else {
        currentList.add(modelId);
      }
      return {
        ...prev,
        planModels: {
          ...planModels,
          [planKey]: {
            ...planModels[planKey],
            [field]: Array.from(currentList),
          },
        },
      };
    });
  };

  const handleSave = () => {
    if (!user || user.systemRole !== 'Super Admin' || !config) return;
    startTransition(async () => {
      const validModelIds = new Set(config.apiModels.map((model: any) => model.value));
      const sanitize = (values?: string[]) => (values || []).filter((value) => validModelIds.has(value));
      const sanitizeDefault = (value?: string) => (value && validModelIds.has(value) ? value : '');
      const preparedConfig: AiAgentConfig = {
        ...config,
        planModels: config.planModels ? {
          free: {
            ...config.planModels.free,
            defaultModel: sanitizeDefault(config.planModels.free?.defaultModel),
            abTestModels: sanitize(config.planModels.free?.abTestModels),
          },
          pro: {
            ...config.planModels.pro,
            defaultModel: sanitizeDefault(config.planModels.pro?.defaultModel),
            abTestModels: sanitize(config.planModels.pro?.abTestModels),
          },
          business: {
            ...config.planModels.business,
            defaultModel: sanitizeDefault(config.planModels.business?.defaultModel),
            availableModels: sanitize(config.planModels.business?.availableModels),
          },
          enterprise: {
            ...config.planModels.enterprise,
            defaultModel: sanitizeDefault(config.planModels.enterprise?.defaultModel),
            availableModels: sanitize(config.planModels.enterprise?.availableModels),
          },
        } : undefined,
      };
      const result = await updateAiAgentConfig(user.uid, preparedConfig);
      if (result.success) {
        setInitialConfigSnapshot(JSON.stringify(preparedConfig));
        toast({ title: "Успешно", description: result.message });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  if (isLoading || !config) {
    return (
       <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  const planModels = getPlanModels(config);
  const modelOptions = config.apiModels || [];

  const renderPlanModelChecklist = (
    planKey: 'free' | 'pro' | 'business' | 'enterprise',
    field: 'abTestModels' | 'availableModels',
    selectedValues: string[]
  ) => {
    return (
      <div className="grid gap-2">
        {modelOptions.map((model: any) => (
          <label key={`${planKey}-${field}-${model.value}`} className="flex items-center justify-between rounded-md border p-2">
            <div className="flex flex-col">
              <span className="text-sm">{model.label}</span>
              <span className="text-xs text-muted-foreground">{model.provider}</span>
            </div>
            <Checkbox
              checked={selectedValues.includes(model.value)}
              onCheckedChange={() => togglePlanModelList(planKey, field, model.value)}
              disabled={isPending}
            />
          </label>
        ))}
      </div>
    );
  };

  const renderModelSettings = (modelInfo: any, index: number) => {
    return (
        <Card key={modelInfo.value}>
            <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5"/>{modelInfo.label}
                    </CardTitle>
                    <CardDescription>{modelInfo.value}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => { setModelToEdit({ model: modelInfo, index }); setIsModelDialogOpen(true); }}>
                      <Edit className="h-4 w-4"/>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Вы хотите удалить модель "{modelInfo.label}"?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleRemoveModel(index)}>Удалить</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    <div className="flex items-center space-x-2"><Switch id={`thoughts-${index}`} checked={modelInfo.supportsThoughts} onCheckedChange={c => handleModelConfigChange(index, 'supportsThoughts', c)} /><Label htmlFor={`thoughts-${index}`}>Мысли</Label></div>
                    <div className="flex items-center space-x-2"><Switch id={`images-${index}`} checked={modelInfo.canGenerateImages} onCheckedChange={c => handleModelConfigChange(index, 'canGenerateImages', c)} /><Label htmlFor={`images-${index}`}>Картинки</Label></div>
                    <div className="flex items-center space-x-2"><Switch id={`audio-${index}`} checked={modelInfo.canProcessAudio} onCheckedChange={c => handleModelConfigChange(index, 'canProcessAudio', c)} /><Label htmlFor={`audio-${index}`}>Аудио</Label></div>
                    <div className="flex items-center space-x-2"><Switch id={`service-${index}`} checked={!!modelInfo.isServiceModel} onCheckedChange={(c) => handleSetServiceModel(index, !!c)} /><Label htmlFor={`service-${index}`}>Сервисная</Label></div>
                    <div className="flex items-center space-x-2">
                        <Switch
                          id={`voice-${index}`}
                          checked={!!modelInfo.isVoiceModel}
                          onCheckedChange={(c) => handleSetVoiceModel(index, !!c)}
                          disabled={!modelInfo.canProcessAudio}
                        />
                        <Label htmlFor={`voice-${index}`}>Голос</Label>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <>
    <ModelConfigDialog
        isOpen={isModelDialogOpen}
        onClose={handleCloseModelDialog}
        onSave={handleSaveModel}
        initialData={modelToEdit?.model}
        editIndex={modelToEdit?.index}
        provider={activeProvider}
    />
    <AddModelFromProviderDialog
        isOpen={isAddFromProviderDialogOpen}
        onClose={handleCloseAddFromProviderDialog}
        onAddModels={handleAddMultipleModels}
        existingModels={config.apiModels}
        provider={activeProvider as 'openrouter' | 'xiaomi'}
    />
    <div className="space-y-6">
      <Tabs
        defaultValue={config.providers.openrouter ? "openrouter" : Object.keys(config.providers)[0]}
        onValueChange={(value) => setActiveProvider(value)}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-4">
                {Object.entries(config.providers)
                    .sort(([a], [b]) => (a === 'openrouter' ? -1 : b === 'openrouter' ? 1 : 0))
                    .map(([providerId, providerConfig]) => (
                        <TabsTrigger key={providerId} value={providerId}>{providerConfig.name}</TabsTrigger>
                    ))}
            </TabsList>
        </div>
         {Object.entries(config.providers).map(([providerId, providerConfig]) => (
            <TabsContent key={providerId} value={providerId}>
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle className="capitalize">{providerConfig.name}</CardTitle>
                        <CardDescription>Настройки для провайдера "{providerId}"</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={`base-url-${providerId}`} className="flex items-center gap-2"><Link className="h-4 w-4"/>Базовый URL</Label>
                            <Input id={`base-url-${providerId}`} value={providerConfig.baseUrl} onChange={(e) => handleProviderConfigChange(providerId, 'baseUrl', e.target.value)} disabled={isPending}/>
                        </div>

                        {/* Xiaomi: Endpoints, API Keys, Stats */}
                        {providerId === 'xiaomi' && (
                            <div className="pt-2">
                                <Separator className="mb-4" />
                                <XiaomiProviderPanel />
                                <Separator className="mt-4" />
                            </div>
                        )}

                         {providerId === 'openrouter' && (
                             <div className="space-y-4 pt-4">
                                <Separator />
                                <h4 className="text-md font-semibold pt-2">Приоритет обработки PDF</h4>
                                <p className="text-sm text-muted-foreground">Измените порядок, чтобы определить, какой движок будет использоваться первым. Если произойдет ошибка, система автоматически попробует следующий движок в списке.</p>
                                <div className="space-y-2 rounded-lg border p-3">
                                    {(config.providers.openrouter.pdfProcessingPriority || []).map((engine, index) => (
                                        <div key={engine} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                            <span className="font-medium">{index + 1}. {engine}</span>
                                            <div className="flex gap-1">
                                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveEngine(engine, 'up')} disabled={index === 0}>
                                                    <ChevronsUpDown className="h-4 w-4 transform -rotate-90"/>
                                                </Button>
                                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveEngine(engine, 'down')} disabled={index === (config.providers.openrouter.pdfProcessingPriority || []).length - 1}>
                                                    <ChevronsUpDown className="h-4 w-4 transform rotate-90"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Separator/>

                        {/* Кнопки управления моделями — привязаны к текущему провайдеру */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddFromProviderDialogOpen(true)}>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Загрузить модели из {providerConfig.name}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => { setModelToEdit(null); setIsModelDialogOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Добавить модель вручную
                            </Button>
                        </div>

                        <Separator/>
                        <h4 className="text-md font-semibold pt-2">Модели этого провайдера</h4>
                        <div className="space-y-4">
                            {config.apiModels.filter(model => model.provider === providerId).length === 0 && (
                                <p className="text-sm text-muted-foreground py-4">Нет моделей для этого провайдера. Добавьте модели через кнопки выше.</p>
                            )}
                            {config.apiModels.filter(model => model.provider === providerId).map((model) => {
                                const originalIndex = config.apiModels.findIndex(m => m.value === model.value && m.provider === model.provider);
                                return renderModelSettings(model, originalIndex);
                            })}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        ))}
      </Tabs>

      {/* Two-Stage Pipeline Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Двухэтапный пайплайн обработки PDF
          </CardTitle>
          <CardDescription>
            PDF → S3 → URL → <strong>Этап 1:</strong> извлечение текста (OCR/Markdown) → <strong>Этап 2:</strong> финальный анализ.
            Каждый этап использует свою модель и провайдер.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Visual pipeline flow */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-muted-foreground py-2">
            <span className="rounded-md bg-muted px-2 py-1 font-medium">PDF файл</span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded-md bg-muted px-2 py-1 font-medium">S3 хранилище</span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 font-medium border border-blue-500/20">
              Этап 1: OCR
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded-md bg-muted px-2 py-1 font-medium">Markdown</span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded-md bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 font-medium border border-green-500/20">
              Этап 2: Анализ
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded-md bg-muted px-2 py-1 font-medium">JSON ответ</span>
          </div>

          <Separator />

          {/* Stage 1: OCR */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-500/20">1</div>
              <div>
                <h4 className="text-sm font-semibold">Этап 1 — Извлечение текста (OCR)</h4>
                <p className="text-xs text-muted-foreground">PDF → текст/Markdown. Рекомендуется бесплатная модель.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-9">
              <div className="space-y-2">
                <Label htmlFor="ocr-provider">Провайдер</Label>
                <Select
                  value={config.ocrProvider || 'openrouter'}
                  onValueChange={(value) => {
                    setConfig(prev => {
                      if (!prev) return null;
                      // Сбросить модель OCR при смене провайдера
                      return { ...prev, ocrProvider: value, ocrModel: '' };
                    });
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="ocr-provider">
                    <SelectValue placeholder="Выберите провайдер" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(config.providers).map(([id, prov]) => (
                      <SelectItem key={`ocr-prov-${id}`} value={id}>{prov.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocr-model">Модель</Label>
                <Select
                  value={config.ocrModel || ''}
                  onValueChange={(value) => setConfig(prev => prev ? { ...prev, ocrModel: value } : null)}
                  disabled={isPending}
                >
                  <SelectTrigger id="ocr-model">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.apiModels
                      .filter(m => m.provider === (config.ocrProvider || 'openrouter'))
                      .map((model: any) => (
                        <SelectItem key={`ocr-${model.value}`} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    {config.apiModels.filter(m => m.provider === (config.ocrProvider || 'openrouter')).length === 0 && (
                      <SelectItem value="__none__" disabled>Нет моделей для этого провайдера</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Текущая: <code>{config.ocrModel || 'не выбрана'}</code>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stage 2: Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-bold border border-green-500/20">2</div>
              <div>
                <h4 className="text-sm font-semibold">Этап 2 — Финальный анализ</h4>
                <p className="text-xs text-muted-foreground">Markdown → JSON результат. Рекомендуется мощная модель.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-9">
              <div className="space-y-2">
                <Label htmlFor="analysis-provider">Провайдер</Label>
                <Select
                  value={config.analysisProvider || 'xiaomi'}
                  onValueChange={(value) => {
                    setConfig(prev => {
                      if (!prev) return null;
                      return { ...prev, analysisProvider: value, analysisModel: '' };
                    });
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="analysis-provider">
                    <SelectValue placeholder="Выберите провайдер" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(config.providers).map(([id, prov]) => (
                      <SelectItem key={`analysis-prov-${id}`} value={id}>{prov.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="analysis-model">Модель</Label>
                <Select
                  value={config.analysisModel || ''}
                  onValueChange={(value) => setConfig(prev => prev ? { ...prev, analysisModel: value } : null)}
                  disabled={isPending}
                >
                  <SelectTrigger id="analysis-model">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.apiModels
                      .filter(m => m.provider === (config.analysisProvider || 'xiaomi'))
                      .map((model: any) => (
                        <SelectItem key={`analysis-${model.value}`} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    {config.apiModels.filter(m => m.provider === (config.analysisProvider || 'xiaomi')).length === 0 && (
                      <SelectItem value="__none__" disabled>Нет моделей для этого провайдера</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Текущая: <code>{config.analysisModel || 'не выбрана'}</code>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info box */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Как работает пайплайн:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>PDF загружается в S3 хранилище и получает публичный URL</li>
                  <li><strong>Этап 1:</strong> URL отправляется в OCR модель для извлечения текста в формате Markdown</li>
                  <li>Markdown передаётся во второй этап (при необходимости кешируется)</li>
                  <li><strong>Этап 2:</strong> Markdown + промпт отправляются в модель анализа для получения JSON ответа</li>
                </ol>
                <p className="pt-1">Пайплайн активируется автоматически когда выбрана Xiaomi модель для анализа и загружен PDF файл.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Модели по тарифам</CardTitle>
          <CardDescription>Настройте модель для Free/PRO и список доступных моделей для Business/Enterprise. Для Free/PRO можно включить A/B тест, добавив несколько моделей.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Free</h4>
              <div className="space-y-2">
                <Label htmlFor="plan-free-default">Модель по умолчанию</Label>
                <Select
                  value={planModels.free.defaultModel || ''}
                  onValueChange={(value) => updatePlanModelField('free', 'defaultModel', value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="plan-free-default">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model: any) => (
                      <SelectItem key={`free-default-${model.value}`} value={model.value}>
                        {model.label} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>A/B тест моделей (покажем пользователю выбор)</Label>
                {renderPlanModelChecklist('free', 'abTestModels', planModels.free.abTestModels || [])}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">PRO</h4>
              <div className="space-y-2">
                <Label htmlFor="plan-pro-default">Модель по умолчанию</Label>
                <Select
                  value={planModels.pro.defaultModel || ''}
                  onValueChange={(value) => updatePlanModelField('pro', 'defaultModel', value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="plan-pro-default">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model: any) => (
                      <SelectItem key={`pro-default-${model.value}`} value={model.value}>
                        {model.label} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>A/B тест моделей (покажем пользователю выбор)</Label>
                {renderPlanModelChecklist('pro', 'abTestModels', planModels.pro.abTestModels || [])}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Business</h4>
              <div className="space-y-2">
                <Label>Доступные модели</Label>
                {renderPlanModelChecklist('business', 'availableModels', planModels.business.availableModels || [])}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Enterprise</h4>
              <div className="space-y-2">
                <Label>Доступные модели</Label>
                {renderPlanModelChecklist('enterprise', 'availableModels', planModels.enterprise.availableModels || [])}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-6">
          <Card>
              <CardFooter className="pt-6">
                  <Button type="button" onClick={handleSave} disabled={isPending || !hasUnsavedChanges} className="w-full">
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Сохранить всю конфигурацию AI
                  </Button>
              </CardFooter>
          </Card>
      </div>
    </div>
    </>
  );
}

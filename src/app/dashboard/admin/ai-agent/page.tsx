// src/app/dashboard/admin/ai-agent/page.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Bot, BrainCircuit, Link, Trash2, PlusCircle, DownloadCloud, Info, FileJson, Edit, ChevronsUpDown } from "lucide-react";
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


export default function AdminAiAgentPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [config, setConfig] = useState<AiAgentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<{ model: any; index: number } | null>(null);
  const [isAddFromProviderDialogOpen, setIsAddFromProviderDialogOpen] = useState(false);
  const loadedForUserRef = useRef<string | null>(null);
  
  const hasUnsavedChanges = useMemo(() => {
    // This logic needs to be implemented if you want to track changes
    // For now, we'll just enable the save button always
    return true;
  }, [config]);

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

  const handleSetServiceModel = (modelIndex: number, enabled: boolean) => {
    setConfig(prev => {
      if (!prev) return null;
      const newApiModels = prev.apiModels.map((model: any, index: number) => ({
        ...model,
        isServiceModel: index === modelIndex ? enabled : false,
      }));
      return { ...prev, apiModels: newApiModels };
    });
  };

  const handleSetVoiceModel = (modelIndex: number, enabled: boolean) => {
    setConfig(prev => {
      if (!prev) return null;
      const newApiModels = prev.apiModels.map((model: any, index: number) => ({
        ...model,
        isVoiceModel: index === modelIndex ? enabled : false,
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
            // Adding new model
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
  
  const handleAddMultipleModels = (models: { id: string, name: string }[]) => {
      const newModels = models.map(m => ({
          value: m.id,
          label: m.name,
          provider: 'openrouter',
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
            <span className="text-sm">{model.label}</span>
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
    />
    <AddModelFromProviderDialog
        isOpen={isAddFromProviderDialogOpen}
        onClose={handleCloseAddFromProviderDialog}
        onAddModels={handleAddMultipleModels}
        existingModels={config.apiModels}
    />
    <div className="space-y-6">
      {/** приоритет openrouter по умолчанию */}
      <Tabs defaultValue={config.providers.openrouter ? "openrouter" : Object.keys(config.providers)[0]}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-4">
                {Object.entries(config.providers)
                    .sort(([a], [b]) => (a === 'openrouter' ? -1 : b === 'openrouter' ? 1 : 0))
                    .map(([providerId, providerConfig]) => (
                        <TabsTrigger key={providerId} value={providerId}>{providerConfig.name}</TabsTrigger>
                    ))}
            </TabsList>
            <Button type="button" variant="outline" size="icon" onClick={() => setIsAddFromProviderDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
            </Button>
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
                                <Separator />
                                <Button type="button" variant="outline" onClick={() => setIsAddFromProviderDialogOpen(true)}>
                                    <DownloadCloud className="mr-2 h-4 w-4" />
                                    Загрузить и добавить модели из OpenRouter
                                </Button>
                            </div>
                        )}
                        <Separator/>
                        <h4 className="text-md font-semibold pt-2">Модели этого провайдера</h4>
                        <div className="space-y-4">
                            {config.apiModels.filter(model => model.provider === providerId).map((model, index) => {
                                const originalIndex = config.apiModels.findIndex(m => m.value === model.value);
                                return renderModelSettings(model, originalIndex);
                            })}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        ))}
      </Tabs>

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
                        {model.label}
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
                        {model.label}
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

        <Card>
            <CardHeader>
                <CardTitle>Управление моделями</CardTitle>
            </CardHeader>
            <CardContent>
                 <Button type="button" variant="outline" onClick={() => { setModelToEdit(null); setIsModelDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Добавить модель вручную
                </Button>
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

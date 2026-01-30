// @ts-nocheck
// src/components/admin/dialogs/AddModelFromProviderDialog.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, PlusCircle, BrainCircuit, ArrowRightLeft, File as FileIcon, Music, RefreshCw, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { getOpenRouterModels, type OpenRouterModel } from '@/services/openrouter';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface AddModelFromProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddModels: (models: { id: string, name: string }[]) => void;
  existingModels: any[];
}

export function AddModelFromProviderDialog({ isOpen, onClose, onAddModels, existingModels }: AddModelFromProviderDialogProps) {
  const [isLoading, startLoading] = useTransition();
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadModels = (closeOnError = true) => {
    startLoading(async () => {
      try {
        const models = await getOpenRouterModels();
        setAllModels(models);
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: `Не удалось загрузить модели от OpenRouter: ${error.message}`,
          variant: "destructive",
        });
        if (closeOnError) {
          onClose();
        }
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadModels(true);
    }
  }, [isOpen, toast, onClose]);
  
  const filteredAndSortedModels = useMemo(() => {
      const existingModelIds = new Set(existingModels.map(m => m.value));
      const search = searchTerm.trim().toLowerCase();
      return allModels
        .filter(model => !existingModelIds.has(model.id))
        .filter(model => {
          if (!search) return true;
          const haystack = [
            model.name,
            model.id,
            model.description,
            model.architecture?.modality,
            model.architecture?.tokenizer,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(search);
        })
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [allModels, searchTerm, existingModels]);

  const handleSelectionChange = (modelId: string) => {
    setSelectedModels(prev => {
        const newSet = new Set(prev);
        if(newSet.has(modelId)) {
            newSet.delete(modelId);
        } else {
            newSet.add(modelId);
        }
        return newSet;
    });
  };

  const handleConfirm = () => {
      const modelsToAdd = allModels.filter(m => selectedModels.has(m.id)).map(m => ({ id: m.id, name: m.name }));
      if (modelsToAdd.length > 0) {
          onAddModels(modelsToAdd);
          toast({ title: "Модели добавлены", description: `Добавлено ${modelsToAdd.length} новых моделей.`});
      }
      onClose();
  };
  
  useEffect(() => {
      if (!isOpen) {
          setAllModels([]);
          setSearchTerm('');
          setSelectedModels(new Set());
          setExpandedModelId(null);
      }
  }, [isOpen]);
  
  const formatPrice = (price: string) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return '—';
    return `$${(value * 1_000_000).toFixed(2)}`;
  };

  const getModelCapabilities = (model: OpenRouterModel) => {
      const capabilities = {
          vision: false,
          audio: false,
          reasoning: false
      };
      
      const lowerId = model.id.toLowerCase();
      const arch = model.architecture?.modality;

      if (arch === 'vision' || arch === 'multimodal' || lowerId.includes('vision')) {
          capabilities.vision = true;
      }
      if (lowerId.includes('audio') || lowerId.includes('speech')) {
          capabilities.audio = true;
      }
      if (lowerId.includes('claude') || lowerId.includes('gpt-4') || lowerId.includes('gemini')) {
          capabilities.reasoning = true;
      }
      
      return capabilities;
  }

  const toggleExpanded = (modelId: string) => {
    setExpandedModelId(prev => (prev === modelId ? null : modelId));
  };

  const addSingleModel = (model: OpenRouterModel) => {
    onAddModels([{ id: model.id, name: model.name }]);
    toast({ title: "Модель добавлена", description: `Добавлена модель ${model.name}.`});
  };

  const handleSelectAllFiltered = () => {
    setSelectedModels(new Set(filteredAndSortedModels.map(model => model.id)));
  };

  const handleClearSelection = () => {
    setSelectedModels(new Set());
  };

  const renderModelDetails = (model: OpenRouterModel) => {
    return (
      <div className="space-y-3">
        {model.description && (
          <div>
            <p className="text-sm font-medium">Описание</p>
            <p className="text-sm text-muted-foreground">{model.description}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium">Параметры модели (OpenRouter)</p>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(model, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить модели из OpenRouter</DialogTitle>
          <DialogDescription>
            Выберите модели из списка для добавления. Уже добавленные модели отфильтрованы.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input
                    placeholder="Поиск по названию, ID, описанию..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadModels(false)} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить список
            </Button>
        </div>
        <div className="flex-1 overflow-auto border rounded-md">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        ) : (
             <Table>
                 <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Название модели</TableHead>
                        <TableHead className="text-center w-24">Контекст</TableHead>
                        <TableHead className="text-center w-40">Цена (вход/выход)</TableHead>
                        <TableHead className="text-center w-32">Возможности</TableHead>
                        <TableHead className="text-center w-36">Действия</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                     {filteredAndSortedModels.map(model => {
                        const capabilities = getModelCapabilities(model);
                        const pricing = model.pricing || {};
                        return (
                            <Fragment key={model.id}>
                            <TableRow className="cursor-pointer" onClick={() => handleSelectionChange(model.id)}>
                                <TableCell className="text-center">
                                    <Checkbox
                                        id={`model-select-${model.id}`}
                                        checked={selectedModels.has(model.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Label htmlFor={`model-select-${model.id}`} className="font-medium">{model.name}</Label>
                                    <p className="text-xs text-muted-foreground">{model.id}</p>
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono">{(model.context_length / 1000).toFixed(0)}k</TableCell>
                                <TableCell className="text-xs font-mono">
                                    <div className="flex items-center justify-end gap-1"><ArrowRightLeft className="h-3 w-3 text-green-500" /> <span>{formatPrice(pricing.prompt)}</span></div>
                                    <div className="flex items-center justify-end gap-1"><ArrowRightLeft className="h-3 w-3 text-blue-500" /> <span>{formatPrice(pricing.completion)}</span></div>
                                </TableCell>
                                 <TableCell className="text-center">
                                     <div className="flex items-center justify-center gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <FileIcon className={capabilities.vision ? "h-4 w-4 text-foreground" : "h-4 w-4 text-muted-foreground/30"}/>
                                                </TooltipTrigger>
                                                <TooltipContent>Поддержка PDF/Изображений</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                     <Music className={capabilities.audio ? "h-4 w-4 text-foreground" : "h-4 w-4 text-muted-foreground/30"}/>
                                                </TooltipTrigger>
                                                <TooltipContent>Поддержка Аудио</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <BrainCircuit className={capabilities.reasoning ? "h-4 w-4 text-foreground" : "h-4 w-4 text-muted-foreground/30"}/>
                                                </TooltipTrigger>
                                                <TooltipContent>Поддержка "Мыслей"</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        addSingleModel(model);
                                      }}
                                    >
                                      <PlusCircle className="mr-1 h-4 w-4" />
                                      Добавить
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleExpanded(model.id);
                                      }}
                                    >
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedModelId === model.id ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </div>
                                </TableCell>
                            </TableRow>
                            {expandedModelId === model.id && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/40">
                                  {renderModelDetails(model)}
                                </TableCell>
                              </TableRow>
                            )}
                            </Fragment>
                        )
                     })}
                 </TableBody>
             </Table>
        )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleSelectAllFiltered} disabled={!filteredAndSortedModels.length}>
            Выбрать все
          </Button>
          <Button variant="ghost" onClick={handleClearSelection} disabled={selectedModels.size === 0}>
            Снять выбор
          </Button>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={selectedModels.size === 0}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить выбранные ({selectedModels.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

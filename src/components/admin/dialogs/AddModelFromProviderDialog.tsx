// @ts-nocheck
// src/components/admin/dialogs/AddModelFromProviderDialog.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, PlusCircle, BrainCircuit, ArrowRightLeft, File as FileIcon, Music, RefreshCw, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { getOpenRouterModels, type OpenRouterModel } from '@/services/openrouter';
import { getXiaomiModels, type XiaomiModel } from '@/services/xiaomi';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Unified model type for the dialog (compatible with both providers)
type CatalogModel = {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
  };
  [key: string]: any;
};

interface AddModelFromProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddModels: (models: { id: string, name: string }[]) => void;
  existingModels: any[];
  /** Текущий провайдер: определяет откуда загружать каталог и какой provider ставить */
  provider: 'openrouter' | 'xiaomi';
}

type SortField =
  | 'name'
  | 'model_id'
  | 'context'
  | 'prompt_price'
  | 'completion_price'
  | 'request_price'
  | 'capabilities';
type CapabilityFilter = 'all' | 'vision' | 'audio' | 'reasoning';

export function AddModelFromProviderDialog({ isOpen, onClose, onAddModels, existingModels, provider }: AddModelFromProviderDialogProps) {
  const [isLoading, startLoading] = useTransition();
  const [allModels, setAllModels] = useState<CatalogModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>('all');
  const [onlyRussianMention, setOnlyRussianMention] = useState(false);
  const { toast } = useToast();

  const providerName = provider === 'xiaomi' ? 'Xiaomi MiMo' : 'OpenRouter';

  const loadModels = (closeOnError = true) => {
    startLoading(async () => {
      try {
        let models: CatalogModel[];
        if (provider === 'xiaomi') {
          models = await getXiaomiModels();
          if (models.length === 0) {
            toast({
              title: "Информация",
              description: "Xiaomi API не поддерживает каталог моделей. Добавляйте модели вручную.",
            });
          }
        } else {
          models = await getOpenRouterModels();
        }
        setAllModels(models);
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: `Не удалось загрузить модели от ${providerName}: ${error.message}`,
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
  }, [isOpen]);

  function getModelCapabilities(model: CatalogModel) {
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
      if (lowerId.includes('claude') || lowerId.includes('gpt-4') || lowerId.includes('gemini') || lowerId.includes('mimo')) {
          capabilities.reasoning = true;
      }

      return capabilities;
  }

  function hasEnglishRussianMention(model: CatalogModel) {
    const corpus = [
      model.description || '',
      model.name || '',
      model.id || '',
      model.architecture?.modality || '',
      model.architecture?.tokenizer || '',
    ]
      .join(' ')
      .toLowerCase();

    return /\brussian(?:\s+language)?\b|\bcyrillic\b|\bsupports?\s+russian\b|\brussian\s+support\b/.test(corpus);
  }

  const parsePriceValue = (value?: string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getCapabilityScore = (model: CatalogModel) => {
    const capabilities = getModelCapabilities(model);
    return Number(capabilities.vision) + Number(capabilities.audio) + Number(capabilities.reasoning);
  };

  const filteredAndSortedModels = useMemo(() => {
      // Фильтруем только по моделям ТЕКУЩЕГО провайдера (не глобально)
      const existingModelIds = new Set(
        existingModels.filter(m => m.provider === provider).map(m => m.value)
      );
      const search = searchTerm.trim().toLowerCase();
      const filtered = allModels
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
        .filter((model) => {
          if (capabilityFilter === 'all') return true;
          const capabilities = getModelCapabilities(model);
          return Boolean(capabilities[capabilityFilter]);
        })
        .filter((model) => {
          if (!onlyRussianMention) return true;
          return hasEnglishRussianMention(model);
        });

      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
      return filtered.sort((a, b) => {
        let left: number | string | null = null;
        let right: number | string | null = null;
        switch (sortField) {
          case 'name':
            left = a.name || '';
            right = b.name || '';
            break;
          case 'model_id':
            left = a.id || '';
            right = b.id || '';
            break;
          case 'context':
            left = Number(a.context_length) || 0;
            right = Number(b.context_length) || 0;
            break;
          case 'prompt_price':
            left = parsePriceValue(a.pricing?.prompt) ?? Number.POSITIVE_INFINITY;
            right = parsePriceValue(b.pricing?.prompt) ?? Number.POSITIVE_INFINITY;
            break;
          case 'completion_price':
            left = parsePriceValue(a.pricing?.completion) ?? Number.POSITIVE_INFINITY;
            right = parsePriceValue(b.pricing?.completion) ?? Number.POSITIVE_INFINITY;
            break;
          case 'request_price':
            left = parsePriceValue(a.pricing?.request) ?? Number.POSITIVE_INFINITY;
            right = parsePriceValue(b.pricing?.request) ?? Number.POSITIVE_INFINITY;
            break;
          case 'capabilities':
            left = getCapabilityScore(a);
            right = getCapabilityScore(b);
            break;
        }

        if (typeof left === 'number' && typeof right === 'number') {
          return (left - right) * directionMultiplier;
        }
        return String(left ?? '').localeCompare(String(right ?? ''), 'ru', { sensitivity: 'base' }) * directionMultiplier;
      });
  }, [allModels, searchTerm, existingModels, sortField, sortDirection, capabilityFilter, onlyRussianMention, provider]);

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
          toast({ title: "Модели добавлены", description: `Добавлено ${modelsToAdd.length} новых моделей в ${providerName}.`});
      }
      onClose();
  };

  useEffect(() => {
      if (!isOpen) {
          setAllModels([]);
          setSearchTerm('');
          setSelectedModels(new Set());
          setExpandedModelId(null);
          setCapabilityFilter('all');
          setOnlyRussianMention(false);
      }
  }, [isOpen]);

  const formatPrice = (price: string) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return '—';
    return `$${(value * 1_000_000).toFixed(2)}`;
  };

  const toggleExpanded = (modelId: string) => {
    setExpandedModelId(prev => (prev === modelId ? null : modelId));
  };

  const addSingleModel = (model: CatalogModel) => {
    onAddModels([{ id: model.id, name: model.name }]);
    toast({ title: "Модель добавлена", description: `Добавлена модель ${model.name} в ${providerName}.`});
  };

  const handleSelectAllFiltered = () => {
    setSelectedModels(new Set(filteredAndSortedModels.map(model => model.id)));
  };

  const handleClearSelection = () => {
    setSelectedModels(new Set());
  };

  const handleSortByColumn = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const renderModelDetails = (model: CatalogModel) => {
    return (
      <div className="space-y-3">
        {model.description && (
          <div>
            <p className="text-sm font-medium">Описание</p>
            <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{model.description}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium">Параметры модели ({providerName})</p>
          <pre className="mt-2 max-h-64 w-full max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words break-all rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(model, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,1400px)] max-w-[96vw] h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить модели из {providerName}</DialogTitle>
          <DialogDescription>
            Выберите модели из списка для добавления. Уже добавленные модели в этом провайдере отфильтрованы.
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
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Категория</Label>
              <Select value={capabilityFilter} onValueChange={(value) => setCapabilityFilter(value as CapabilityFilter)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="vision">Vision/PDF</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="reasoning">Reasoning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Сортировка</Label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">По алфавиту (имя)</SelectItem>
                  <SelectItem value="model_id">По ID модели</SelectItem>
                  <SelectItem value="context">По контексту</SelectItem>
                  <SelectItem value="prompt_price">По цене input токена</SelectItem>
                  <SelectItem value="completion_price">По цене output токена</SelectItem>
                  <SelectItem value="request_price">По цене запроса</SelectItem>
                  <SelectItem value="capabilities">По возможностям</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={sortDirection === 'asc' ? 'По возрастанию' : 'По убыванию'}
              >
                {sortDirection === 'asc' ? 'ASC' : 'DESC'}
              </Button>
            </div>
            <Button
              type="button"
              variant={onlyRussianMention ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOnlyRussianMention((prev) => !prev)}
              title="Показывать модели, где в описании/метаданных есть англоязычное упоминание русского языка (Russian/Cyrillic)"
            >
              {onlyRussianMention ? 'Russian mention: ON' : 'Filter: Russian mention'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => loadModels(false)} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить список
            </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Показано моделей: {filteredAndSortedModels.length}{onlyRussianMention ? ' (только с упоминанием Russian/Cyrillic)' : ''}
        </div>
        <div className="flex-1 overflow-auto border rounded-md">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        ) : allModels.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full gap-2 text-muted-foreground">
                <p className="text-sm">Каталог моделей {providerName} недоступен.</p>
                <p className="text-xs">Используйте кнопку «Добавить модель вручную» для ручного добавления.</p>
            </div>
        ) : (
             <Table>
                 <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSortByColumn('name')}>
                            Название модели <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center w-24">
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSortByColumn('context')}>
                            Контекст <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center w-40">
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSortByColumn('prompt_price')}>
                            Цена (вход/выход) <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center w-32">
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleSortByColumn('capabilities')}>
                            Возможности <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
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
                                <TableCell className="max-w-[420px] align-top">
                                    <Label htmlFor={`model-select-${model.id}`} className="font-medium block truncate">{model.name}</Label>
                                    <p className="text-xs text-muted-foreground break-all whitespace-normal">{model.id}</p>
                                </TableCell>
                                <TableCell className="text-center text-sm font-mono">{(model.context_length / 1000).toFixed(0)}k</TableCell>
                                <TableCell className="text-xs font-mono">
                                    <div className="flex items-center justify-end gap-1"><ArrowRightLeft className="h-3 w-3 text-success" /> <span>{formatPrice(pricing.prompt)}</span></div>
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
                                      type="button"
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
                                      type="button"
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
          <Button type="button" variant="outline" onClick={handleSelectAllFiltered} disabled={!filteredAndSortedModels.length}>
            Выбрать все
          </Button>
          <Button type="button" variant="ghost" onClick={handleClearSelection} disabled={selectedModels.size === 0}>
            Снять выбор
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedModels.size === 0}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Добавить выбранные ({selectedModels.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

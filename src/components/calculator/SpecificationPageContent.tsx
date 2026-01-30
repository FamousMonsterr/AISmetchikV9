// @ts-nocheck
// src/components/calculator/SpecificationPageContent.tsx
"use client";

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext, type SpecificationItem, type HistoryRequest, type QuoteConfig, initialQuoteConfig, AnalysisDetails, ActionLog, ActionSnapshot, UserRole, Company } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, GitCommit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveProjectVersion } from '@/actions/userActions';
import { nanoid } from 'nanoid';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { RefineProjectDialog } from '@/components/RefineProjectDialog';
import { FindMissingDialog } from '@/components/FindMissingDialog';
import { PrivatePriceDialog } from '@/components/PrivatePriceDialog';
import { UpgradeAccountDialog } from '@/components/UpgradeAccountDialog';
import { isEqual } from 'lodash';
import { collection, getDocs, query, where, doc, onSnapshot, orderBy, getDoc } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import aiConfig from '@/lib/ai-config.json';
import { ProjectUpdateDialog } from '@/components/ProjectUpdateDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { calculateItemSum, calculateProjectTotals } from '@/lib/calculation';
import { suggestItemPrices } from '@/ai/flows/suggest-item-prices-flow';
import { AIProcessingDialog } from '@/components/AIProcessingDialog';
import { getDefaultModel, generateJson } from '@/services/ai';
import aiConstructorConfig from '@/lib/ai-constructor-config.json';

import { SpecificationTable } from '@/components/calculator/SpecificationTable';
import { AiRecommendations } from '@/components/calculator/AiRecommendations';
import { TotalsAndActions } from '@/components/calculator/TotalsAndActions';
import { AiNotes } from '@/components/calculator/AiNotes';
import { ProjectDetails } from '@/components/calculator/ProjectDetails';
import { QuoteSettings } from '@/components/calculator/QuoteSettings';
import { HistoryActions } from '@/components/calculator/HistoryActions';
import { AiAssistantSettings } from '@/components/calculator/AiAssistantSettings';
import { Calculator } from '@/components/calculator/Calculator';
import { InvoiceHistory } from '../InvoiceHistory';
import { useIsMobile } from '@/hooks/use-mobile';


const { apiModels } = aiConfig;

export const dynamic = 'force-dynamic';

interface SpecificationPageContentProps {
    onBackToProjects?: () => void;
}

export default function SpecificationPageContent({ onBackToProjects }: SpecificationPageContentProps) {
  const router = useRouter();
  const { user, currentProject, setCurrentProject, currentGroup, setCurrentGroup, effectiveRole, resetAppContextState, isNavigating } = useAppContext();
  const { toast } = useToast();
  
  const [isSaving, startSavingTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSaveSnapshotRef = useRef<Record<string, string | null>>({});
  const lastAutoSaveAtRef = useRef<Record<string, number>>({});
  const isAutoSavingRef = useRef<Record<string, boolean>>({});

  const [initialProjectStates, setInitialProjectStates] = useState<Record<string, HistoryRequest>>({});

  const [isRefineDialogOpen, setIsRefineDialogOpen] = useState(false);
  const [refineAction, setRefineAction] = useState<'refine' | 'fill-empty'>('refine');
  const [isFindMissingDialogOpen, setIsFindMissingDialogOpen] = useState(false);
  const [isPriceBaseDialogOpen, setIsPriceBaseDialogOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Enterprise'>('PRO');
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [actionHistoryByProject, setActionHistoryByProject] = useState<Record<string, ActionLog[]>>({});

  // AI settings state moved up to the parent
  const [selectedModel, setSelectedModel] = useState(currentProject?.modelUsed || '');
  const [temperature, setTemperature] = useState(0.2);
  const [includeThoughts, setIncludeThoughts] = useState(false);
  const [aiDialogState, setAiDialogState] = useState<{ isOpen: boolean; title: string; description: string; stages: { key: string; text: string }[], result: { success: boolean; message: string; rawResponse?: any; requestDetails?: any; } | null; currentStage?: string; }>({
    isOpen: false,
    title: '',
    description: '',
    stages: [],
    result: null,
  });

  const [syncByName, setSyncByName] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(currentProject?.id ?? currentGroup?.[0]?.id ?? null);
  const isGroupMode = (currentGroup?.length ?? 0) > 1;
  const initialProjectState = currentProject ? (initialProjectStates[currentProject.id] ?? null) : null;
  const actionHistory = useMemo(() => {
    if (!currentProject) return [];
    return actionHistoryByProject[currentProject.id] ?? [];
  }, [actionHistoryByProject, currentProject?.id]);

  const canUsePrivatePriceBase = user ? user.canUsePrivatePriceBase : false;

  const hasUnsavedChanges = useMemo(() => {
    if (!currentProject || !initialProjectState) return false;
    return !isEqual(
      { spec: currentProject.outputSpecifications, config: currentProject.quoteConfig, details: currentProject.analysisDetails },
      { spec: initialProjectState.outputSpecifications, config: initialProjectState.quoteConfig, details: initialProjectState.analysisDetails }
    );
  }, [currentProject, initialProjectState]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const snapshot = JSON.stringify({
      specs: currentProject.outputSpecifications,
      config: currentProject.quoteConfig,
      details: currentProject.analysisDetails,
      aiComment: currentProject.aiComment,
      notes: currentProject.importantExtractionNotes,
      model: currentProject.modelUsed,
    });

    const projectId = currentProject.id;
    if (snapshot === lastAutoSaveSnapshotRef.current[projectId]) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    const now = Date.now();
    const minIntervalMs = 30000;
    const baseDelayMs = 8000;
    const lastSavedAt = lastAutoSaveAtRef.current[projectId] ?? 0;
    const delayMs = Math.max(baseDelayMs, minIntervalMs - (now - lastSavedAt));

    autoSaveTimerRef.current = window.setTimeout(async () => {
      if (isAutoSavingRef.current[projectId]) return;
      isAutoSavingRef.current[projectId] = true;
      try {
        const result = await saveProjectVersion({
          userId: user.uid,
          versionId: currentProject.id,
          fileName: currentProject.fileName,
          fileUri: currentProject.fileUri || undefined,
          mimeType: currentProject.mimeType || undefined,
          cost: currentProject.cost || 0,
          modelUsed: currentProject.modelUsed,
          outputSpecifications: currentProject.outputSpecifications,
          quoteConfig: currentProject.quoteConfig,
          aiComment: currentProject.aiComment ?? '',
          analysisDetails: currentProject.analysisDetails ?? null,
          importantExtractionNotes: currentProject.importantExtractionNotes ?? [],
          actionHistory,
          status: currentProject.status,
          isMainVersion: !!currentProject.isMainVersion,
          parentProjectId: currentProject.parentProjectId || currentProject.id,
          version: currentProject.version,
          aiCallCount: currentProject.aiCallCount,
          error: currentProject.error,
        });

        if (!result.success) {
          console.error("Auto-save failed:", result.message);
          return;
        }

        lastAutoSaveSnapshotRef.current[projectId] = snapshot;
        lastAutoSaveAtRef.current[projectId] = Date.now();
      } catch (error: any) {
        console.error("Auto-save failed:", error);
      } finally {
        isAutoSavingRef.current[projectId] = false;
      }
    }, delayMs);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentProject, user, toast, actionHistory]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);


  useEffect(() => {
    if (!currentProject) return;
    setInitialProjectStates(prev => {
      if (prev[currentProject.id]) return prev;
      return { ...prev, [currentProject.id]: currentProject };
    });
  }, [currentProject?.id]);

  useEffect(() => {
    if (!user) return;
    setIsLoadingCompanies(true);
    const q = query(collection(db, 'companies'), where('userId', '==', user.uid), orderBy('isDefault', 'desc'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        setCompanies(fetchedCompanies);
        setIsLoadingCompanies(false);
    });
    return () => unsubscribe();
  }, [user]);
  
  const buildSnapshot = (project: HistoryRequest): ActionSnapshot => ({
    outputSpecifications: project.outputSpecifications,
    quoteConfig: project.quoteConfig,
    analysisDetails: project.analysisDetails,
    aiComment: project.aiComment,
    importantExtractionNotes: project.importantExtractionNotes,
    modelUsed: project.modelUsed,
  });

  const setActionHistoryForCurrent = useCallback((updater: ((prev: ActionLog[]) => ActionLog[]) | ActionLog[]) => {
    if (!currentProject) return;
    setActionHistoryByProject(prev => {
      const currentList = prev[currentProject.id] ?? [];
      const nextList = typeof updater === 'function' ? updater(currentList) : updater;
      return { ...prev, [currentProject.id]: nextList };
    });
  }, [currentProject?.id]);

  const logAction = (description: string, snapshot: ActionSnapshot) => {
    const newAction: ActionLog = { id: nanoid(), timestamp: new Date(), description, snapshot };
    setActionHistoryForCurrent(prev => [newAction, ...prev].slice(0, 50));
  };
  
  const updateCurrentProject = (updates: Partial<HistoryRequest>, actionDescription?: string) => {
    if (!currentProject) return;

    if (actionDescription) {
      logAction(actionDescription, buildSnapshot(currentProject));
    }
    
    const nextProject = { ...currentProject, ...updates };
    setCurrentProject(nextProject);
    if (currentGroup) {
      setCurrentGroup(prev => {
        if (!prev) return prev;
        return prev.map(project => project.id === nextProject.id ? nextProject : project);
      });
    }
  };

  useEffect(() => {
    if (!currentProject) return;
    setActionHistoryByProject(prev => {
      if (prev[currentProject.id]) return prev;
      const seededHistory = currentProject.actionHistory && currentProject.actionHistory.length > 0
        ? currentProject.actionHistory.map(action => ({
            ...action,
            timestamp: action.timestamp instanceof Date ? action.timestamp : new Date(action.timestamp),
          }))
        : [];
      return { ...prev, [currentProject.id]: seededHistory };
    });
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentProject) return;
    const model = currentProject.modelUsed || '';
    setSelectedModel(model);
    const modelConfig = aiConfig.apiModels.find(m => m.value === model);
    setTemperature(modelConfig?.temperature || 0.2);
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentGroup || currentGroup.length === 0) return;
    const fallbackId = activeProjectId ?? currentProject?.id ?? currentGroup[0].id;
    if (!activeProjectId) {
      setActiveProjectId(fallbackId);
    }
    if (!currentProject || currentProject.id !== fallbackId) {
      const nextProject = currentGroup.find(project => project.id === fallbackId) ?? currentGroup[0];
      setCurrentProject(nextProject);
    }
  }, [currentGroup, activeProjectId, currentProject?.id]);

  useEffect(() => {
    if (!currentProject?.id) return;
    if (activeProjectId && activeProjectId !== currentProject.id) {
      setActiveProjectId(currentProject.id);
    }
  }, [currentProject?.id]);
  
  const handleModelChange = (model: string) => {
      setSelectedModel(model);
      const modelConfig = aiConfig.apiModels.find(m => m.value === model);
      setTemperature(modelConfig?.temperature || 0.2);
      updateCurrentProject({ modelUsed: model }, `Модель AI изменена на ${model}`);
  };

  const handleProjectTabChange = (projectId: string) => {
    if (!currentGroup) return;
    if (projectId === currentProject?.id) return;
    setActiveProjectId(projectId);
    const nextProject = currentGroup.find(project => project.id === projectId);
    if (nextProject) {
      setCurrentProject(nextProject);
    }
  };

  const updateSpecificationItem = (itemId: string, updates: Partial<SpecificationItem>) => {
    if (!currentProject) return;
    const oldSpecs = currentProject.outputSpecifications;

    const oldItem = oldSpecs.find(i => i.id === itemId);
    const matchName = oldItem?.name?.trim();
    const shouldSyncByName = !!(isGroupMode && syncByName && matchName && !oldItem?.isInformational && currentGroup);

    const applyUpdates = (specs: SpecificationItem[], predicate: (spec: SpecificationItem) => boolean) => {
      return specs.map(spec => {
        if (!predicate(spec)) return spec;
        const updatedSpec = { ...spec, ...updates };
        if (spec.status === 'На утверждение') {
          updatedSpec.status = 'Утверждено';
        }
        return updatedSpec;
      });
    };

    if (shouldSyncByName && currentGroup) {
      logAction(`Изменена позиция '${oldItem?.name}'`, buildSnapshot(currentProject));
      const updatedGroup = currentGroup.map(project => {
        const updatedSpecs = applyUpdates(
          project.outputSpecifications,
          spec => !spec.isInformational && spec.name?.trim() === matchName
        );
        return { ...project, outputSpecifications: updatedSpecs };
      });
      setCurrentGroup(updatedGroup);
      const updatedCurrent = updatedGroup.find(project => project.id === currentProject.id);
      if (updatedCurrent) {
        setCurrentProject(updatedCurrent);
      } else {
        const fallbackSpecs = applyUpdates(oldSpecs, spec => !spec.isInformational && spec.name?.trim() === matchName);
        setCurrentProject({ ...currentProject, outputSpecifications: fallbackSpecs });
      }
      return;
    }

    const newSpecs = applyUpdates(oldSpecs, spec => spec.id === itemId);
    updateCurrentProject({ outputSpecifications: newSpecs }, `Изменена позиция '${oldItem?.name}'`);
  };

  const handleAddItem = () => { 
    if (!currentProject) return;
    const newItem: SpecificationItem = { id: nanoid(), name: 'Новая позиция', quantityToInstall: 1, unit: 'шт', status: 'Утверждено', isRecommended: false, itemType: 'device' };
    const newSpecs = [...currentProject.outputSpecifications, newItem];
    updateCurrentProject({ outputSpecifications: newSpecs }, 'Добавлена новая позиция');
  };

  const handleRemoveItem = (idToRemove: string) => { 
    if (!currentProject) return;
    const oldSpecs = currentProject.outputSpecifications;
    const newSpecs = oldSpecs.filter((item: SpecificationItem) => item.id !== idToRemove);
    const removedItem = oldSpecs.find(i => i.id === idToRemove);
    updateCurrentProject({ outputSpecifications: newSpecs }, `Удалена позиция '${removedItem?.name}'`);
  };

  const handleAddRecommendation = (itemToAdd: SpecificationItem) => {
    if (!currentProject) return;
    const updatedItem = { ...itemToAdd, isRecommended: false };
    let specs = currentProject.outputSpecifications.map(item => item.id === itemToAdd.id ? updatedItem : item);
    const hasRecommendedSection = specs.some(item => item.isInformational && item.name === "Рекомендовано AI");
    if (!hasRecommendedSection) {
      specs.push({ id: nanoid(), name: "Рекомендовано AI", isInformational: true, quantityToInstall: 0, unit: 'шт', status: 'Утверждено', isRecommended: false, itemType: 'other' });
    }
    updateCurrentProject({ outputSpecifications: specs });
  };
  
  const handleAddAllRecommendations = () => {
    if (!currentProject) return;
    let specs = [...currentProject.outputSpecifications];
    let itemsWereAdded = false;

    specs = specs.map(item => {
        if (item.isRecommended) {
            itemsWereAdded = true;
            return { ...item, isRecommended: false };
        }
        return item;
    });

    if (itemsWereAdded) {
        const hasRecommendedSection = specs.some(item => item.isInformational && item.name === "Рекомендовано AI");
        if (!hasRecommendedSection) {
          specs.push({ id: nanoid(), name: "Рекомендовано AI", isInformational: true, quantityToInstall: 0, unit: 'шт', status: 'Утверждено', isRecommended: false, itemType: 'other' });
        }
    }
    updateCurrentProject({ outputSpecifications: specs });
  };

  const handleSaveChanges = async (isNewVersion: boolean, makeMain: boolean) => {
    if (!user || !currentProject) return;
    startSavingTransition(async () => {
        const parentId = currentProject.isMainVersion ? currentProject.id : currentProject.parentProjectId;
        let nextVersionNumber = 1;
        if (isNewVersion || makeMain) {
             const q = query(collection(db, 'requests'), where('parentProjectId', '==', parentId));
             const querySnapshot = await getDocs(q);
             const versions = querySnapshot.docs.map(d => d.data().version || 0);
             if (parentId) {
                const mainProjectDoc = await getDoc(doc(db, 'requests', parentId));
                if(mainProjectDoc.exists()) { versions.push(mainProjectDoc.data().version || 0); }
             }
             nextVersionNumber = Math.max(0, ...versions) + 1;
        }

        const result = await saveProjectVersion({
            userId: user.uid,
            versionId: (isNewVersion || makeMain) ? undefined : currentProject.id,
            fileName: currentProject.fileName, cost: currentProject.cost, status: makeMain ? 'success' : 'draft',
            isMainVersion: makeMain, parentProjectId: parentId,
            outputSpecifications: currentProject.outputSpecifications, aiComment: currentProject.aiComment,
            analysisDetails: currentProject.analysisDetails, importantExtractionNotes: currentProject.importantExtractionNotes,
            quoteConfig: currentProject.quoteConfig, modelUsed: currentProject.modelUsed,
            version: makeMain || isNewVersion ? nextVersionNumber : currentProject.version,
            aiCallCount: currentProject.aiCallCount,
            fileUri: currentProject.fileUri,
            mimeType: currentProject.mimeType,
            actionHistory,
        });

        if(result.success && result.project){
            toast({title: "Успешно!", description: result.message});
             const previousProjectId = currentProject.id;
             setCurrentProject(result.project);
             setInitialProjectStates(prev => ({ ...prev, [result.project.id]: result.project })); // Reset unsaved changes state
             if (currentGroup) {
                setCurrentGroup(prev => {
                  if (!prev) return prev;
                  const hasDirectMatch = prev.some(project => project.id === result.project.id);
                  if (hasDirectMatch) {
                    return prev.map(project => project.id === result.project.id ? result.project : project);
                  }
                  return prev.map(project => project.id === previousProjectId ? result.project : project);
                });
             }
             if (makeMain) {
                 if (onBackToProjects) {
                    onBackToProjects();
                 } else {
                    router.push('/dashboard');
                 }
             }
        } else {
             toast({title: "Ошибка сохранения", description: result.message, variant: "destructive"});
        }
    });
  };
  

  const handleFeatureClick = (isAllowed: boolean, requiredRole: 'PRO' | 'Enterprise') => {
      if (!isAllowed) {
          setUpgradeTargetRole(requiredRole);
          setIsUpgradeModalOpen(true);
      }
  };

  const [smrCost, setSmrCost] = useState(0);

 const handleAIPricing = () => {
    if (!currentProject) return;

    const unapprovedItems = currentProject.outputSpecifications.filter(
        item => !item.isInformational && item.status !== 'Утверждено'
    );

    if (unapprovedItems.length > 0) {
        toast({
            title: "Требуется утверждение",
            description: `Пожалуйста, утвердите все ${unapprovedItems.length} позиций, прежде чем распределять цены.`,
            variant: "destructive",
        });
        return;
    }


    setAiDialogState({
        isOpen: true,
        title: "Запрос цен у AI",
        description: "Распределение общей стоимости по позициям...",
        stages: [
            { key: 'prep', text: 'Подготовка данных' },
            { key: 'ai', text: 'Запрос к AI' },
            { key: 'apply', text: 'Применение цен' },
        ],
        result: null,
        currentStage: 'prep',
    });
    
    startActionTransition(async () => {
        try {
            const oldSpecs = currentProject.outputSpecifications;
            logAction(`Запрос цен у AI`, buildSnapshot({ ...currentProject, outputSpecifications: oldSpecs }));
            
            setAiDialogState(prev => ({...prev, currentStage: 'prep'}));
            const itemsToPrice = oldSpecs
                .filter(item => !item.isInformational)
                .map(item => ({ 
                    id: item.id,
                    name: item.name,
                    model: item.model || '',
                    brand: item.brand || '',
                    unit: item.unit,
                    quantity: item.quantityToInstall || 0,
                    itemType: item.itemType
                }));

            if (itemsToPrice.length === 0) {
                throw new Error("Спецификация пуста, нет позиций для оценки.");
            }
            
            setAiDialogState(prev => ({...prev, currentStage: 'ai'}));
            
            const serviceModelId = await getDefaultModel();

            const result = await generateJson({
                prompt: aiConstructorConfig.prompts.find(p => p.id === 'suggestPricesPrompt')?.promptText || '',
                model: serviceModelId,
                items: itemsToPrice,
                totalSmrCost: smrCost,
                currency: 'RUB',
            });
            
            setAiDialogState(prev => ({ ...prev, result: { success: true, message: "Ответ получен. Проверьте и примените.", rawResponse: result.rawResponse, requestDetails: result.requestDetails } }));

        } catch (error: any) {
            console.error("AI Pricing Error:", error);
            const errorMessage = error.message || "Произошла неизвестная ошибка.";
            setAiDialogState(prev => ({ ...prev, result: { success: false, message: errorMessage, rawResponse: error } }));
        }
    });
  };
  
  const handleApplyPrices = (rawResponse: any) => {
    let pricedItems;
    try {
        let textToParse: string;

        if (typeof rawResponse === 'string') {
            textToParse = rawResponse;
        } else if (rawResponse && rawResponse.choices && rawResponse.choices[0]?.message?.content) {
            textToParse = rawResponse.choices[0].message.content;
        } else if (typeof rawResponse?.text === 'string') {
            textToParse = rawResponse.text;
        } else {
             throw new Error("Не удалось найти текстовое содержимое в ответе AI.");
        }
        
        const jsonMatch = textToParse.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
        if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
            const jsonString = jsonMatch[1] || jsonMatch[2];
            const content = JSON.parse(jsonString);
            pricedItems = content.pricedItems;
        } else {
             // If no markdown block, try parsing the whole string directly
            const content = JSON.parse(textToParse);
            pricedItems = content.pricedItems;
        }

        if (!pricedItems || !Array.isArray(pricedItems)) {
            throw new Error("Ответ AI не содержит корректного массива 'pricedItems'.");
        }

    } catch (e: any) {
        console.error("Failed to parse AI response for pricing:", e);
        toast({ title: "Ошибка парсинга", description: `Не удалось обработать ответ от AI: ${e.message}`, variant: "destructive" });
        setAiDialogState(prev => ({...prev, isOpen: false}));
        return;
    }

    if (!currentProject) return;

    setAiDialogState(prev => ({ ...prev, currentStage: 'apply' }));
    
    const priceMap = new Map((pricedItems || []).map((p: any) => [p.id, p]));
    
    const updatedSpecs = currentProject.outputSpecifications.map(item => {
        if (priceMap.has(item.id)) {
            const pricedData = priceMap.get(item.id)!;
            const newPrice = pricedData.suggestedInstallationPrice ?? item.installationPrice;
            const newComment = [item.comment, pricedData.aiPriceComment].filter(Boolean).join('. ');
            return { ...item, installationPrice: newPrice, comment: newComment, status: 'На утверждение' as const };
        }
        return item;
    });
    
    updateCurrentProject({ outputSpecifications: updatedSpecs }, "Применены цены от AI");
    
    toast({ title: "Цены применены!", description: "Цены на монтаж распределены. Проверьте и утвердите новые цены." });
    setAiDialogState(prev => ({...prev, isOpen: false}));
  };

  const { devicesCount, cableMeters } = useMemo(() => {
    if (!currentProject) return { devicesCount: 0, cableMeters: 0 };
    
    let devices = 0;
    let cable = 0;

    currentProject.outputSpecifications.forEach((item: SpecificationItem) => {
        if (item.isInformational) return;
        if (item.itemType === 'device') devices += item.quantityToInstall || 0;
        if (item.itemType === 'cable') cable += item.quantityToInstall || 0;
    });
    
    return { devicesCount: devices, cableMeters: cable };

  }, [currentProject]);
  
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  
  const handleLoadVersion = async (projectId: string) => {
    if (!user) return;
    const previousProjectId = currentProject?.id;
    startActionTransition(async () => {
      const projectRef = doc(db, 'requests', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const newProjectData = { id: projectSnap.id, ...projectSnap.data() } as HistoryRequest;
        setCurrentProject(newProjectData);
        setInitialProjectStates(prev => ({ ...prev, [newProjectData.id]: newProjectData }));
        if (currentGroup && previousProjectId) {
          setCurrentGroup(prev => {
            if (!prev) return prev;
            return prev.map(project => project.id === previousProjectId ? newProjectData : project);
          });
        }
        setIsVersionDialogOpen(false);
      } else {
        toast({ title: "Ошибка", description: "Не удалось загрузить выбранную версию.", variant: "destructive" });
      }
    });
  };

  const handleRefineProject = (action: 'refine' | 'find-missing' | 'fill-empty') => {
    if (action === 'find-missing') {
      setIsFindMissingDialogOpen(true);
    } else {
      setRefineAction(action);
      setIsRefineDialogOpen(true);
    }
  };

  const normalizeText = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, ' ')
      .trim();
  };

  const getComparisonKey = (item: SpecificationItem) => {
    const name = normalizeText(item.name || '');
    const model = normalizeText(item.model || '');
    return model ? `${name}|${model}` : name;
  };

  const getTextSimilarity = (a: string, b: string) => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.9;
    const aSet = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
    const bSet = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
    if (aSet.size === 0 || bSet.size === 0) return 0;
    let intersection = 0;
    aSet.forEach(word => {
      if (bSet.has(word)) intersection += 1;
    });
    const union = aSet.size + bSet.size - intersection;
    return union === 0 ? 0 : intersection / union;
  };

  const ensureItemType = (item: SpecificationItem): SpecificationItem => {
    if (item.itemType) return item;
    const unit = (item.unit || 'шт').toLowerCase();
    const lowerName = (item.name || '').toLowerCase();
    let itemType: SpecificationItem['itemType'];
    if (unit === 'м' || unit === 'метр' || lowerName.includes('кабель')) {
      itemType = 'cable';
    } else if (unit === 'шт' || unit === 'компл') {
      itemType = 'device';
    } else if (['стяжка', 'дюбель', 'бирка', 'скоба', 'трубка', 'гильза', 'наконечник'].some(c => lowerName.includes(c))) {
      itemType = 'consumable';
    } else {
      itemType = 'other';
    }
    return { ...item, itemType };
  };

  const findInsertionIndex = (specs: SpecificationItem[], item: SpecificationItem) => {
    let bestIndex = -1;
    let bestScore = 0;
    specs.forEach((existing, index) => {
      if (existing.isInformational) return;
      let score = getTextSimilarity(existing.name || '', item.name || '');
      if (existing.itemType && item.itemType && existing.itemType === item.itemType) {
        score += 0.15;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex !== -1 && bestScore >= 0.35) {
      return bestIndex + 1;
    }
    if (item.itemType) {
      for (let i = specs.length - 1; i >= 0; i -= 1) {
        const candidate = specs[i];
        if (!candidate.isInformational && candidate.itemType === item.itemType) {
          return i + 1;
        }
      }
    }
    const informationalIndex = specs.findIndex(spec => spec.isInformational);
    return informationalIndex === -1 ? specs.length : informationalIndex;
  };

  const handleApplyFoundItems = (foundItems: SpecificationItem[]) => {
    if (!currentProject) return;
    const existingKeys = new Set(
      currentProject.outputSpecifications
        .filter(item => !item.isInformational)
        .map(item => getComparisonKey(item))
        .filter(Boolean),
    );
    const seenNewKeys = new Set<string>();
    const dedupedItems = foundItems
      .map(ensureItemType)
      .filter(item => {
        const key = getComparisonKey(item);
        if (!key) return false;
        if (existingKeys.has(key) || seenNewKeys.has(key)) {
          return false;
        }
        seenNewKeys.add(key);
        return true;
      });

    if (dedupedItems.length === 0) {
      toast({ title: "Новых позиций нет", description: "Все найденные позиции уже есть в спецификации." });
      setIsFindMissingDialogOpen(false);
      return;
    }

    const nextSpecs = [...currentProject.outputSpecifications];
    dedupedItems.forEach(item => {
      const insertIndex = findInsertionIndex(nextSpecs, item);
      nextSpecs.splice(insertIndex, 0, {
        ...item,
        id: nanoid(),
        status: 'На утверждение' as const,
      });
    });

    updateCurrentProject({ outputSpecifications: nextSpecs }, `Добавлено ${dedupedItems.length} найденных позиций`);
    toast({ title: "Позиции добавлены", description: `${dedupedItems.length} новых позиций добавлены в спецификацию.` });
    setIsFindMissingDialogOpen(false);
  };

  const isMobile = useIsMobile();
  useEffect(() => {
    if (!isMobile && isNavigating) {
      // Simulate loading for desktop to prevent jarring UI shifts
      // On mobile, native navigation feedback is usually sufficient
    }
  }, [isMobile, isNavigating]);

  if (isNavigating && !isMobile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }
  
  if (!currentProject) {
    return <div className="flex h-full items-center justify-center"><p>Проект не загружен.</p></div>;
  }

  const resolvedActiveProjectId = activeProjectId ?? currentProject.id ?? currentGroup?.[0]?.id ?? '';
  
  return (
    <div className="w-full">
       <UpgradeAccountDialog isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} targetRole={upgradeTargetRole} />
       <ProjectUpdateDialog
          isOpen={isVersionDialogOpen}
          onClose={() => setIsVersionDialogOpen(false)}
          onProjectSelect={handleLoadVersion}
          currentProject={currentProject}
          dialogTitle="Просмотр версий"
          dialogDescription={`Загрузите любую из сохраненных версий для проекта "${currentProject.fileName}".`}
        />
        {isRefineDialogOpen && (
            <RefineProjectDialog
                isOpen={isRefineDialogOpen}
                onClose={() => setIsRefineDialogOpen(false)}
                actionType={refineAction}
                project={currentProject}
                selectedModel={selectedModel}
                temperature={temperature}
                includeThoughts={includeThoughts}
            />
       )}
       {isFindMissingDialogOpen && (
          <FindMissingDialog
            isOpen={isFindMissingDialogOpen}
            onClose={() => setIsFindMissingDialogOpen(false)}
            project={currentProject}
            selectedModel={selectedModel}
            onApply={handleApplyFoundItems}
          />
       )}
       {isPriceBaseDialogOpen && (
          <PrivatePriceDialog isOpen={isPriceBaseDialogOpen} onClose={() => setIsPriceBaseDialogOpen(false)} onConfirm={() => {}} projectId={currentProject.id} />
      )}
      
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-96 lg:sticky lg:top-4 space-y-4 flex-shrink-0 order-1 lg:order-2">
          <TotalsAndActions
            specifications={currentProject.outputSpecifications.filter(item => !item.isRecommended)}
            quoteConfig={currentProject.quoteConfig || initialQuoteConfig}
            activeProject={currentProject}
            companies={companies}
            onSaveDraft={handleSaveChanges}
            isSaving={isSaving}
            isMainVersion={!!currentProject.isMainVersion}
            onAddToPriceBase={() => setIsPriceBaseDialogOpen(true)}
            onRefineProject={handleRefineProject}
            onAIPricing={handleAIPricing}
            isActionLoading={isActionPending}
            canUsePrivatePriceBase={canUsePrivatePriceBase}
            onFeatureClick={handleFeatureClick}
          />
          <HistoryActions 
              actionHistory={actionHistory}
              onUndo={(actionId) => {
                  const actionIndex = actionHistory.findIndex(action => action.id === actionId);
                  if (actionIndex === -1 || !currentProject) return;
                  const action = actionHistory[actionIndex];
                  const snapshot = action.snapshot;
                  const nextProject = {
                    ...currentProject,
                    outputSpecifications: snapshot.outputSpecifications,
                    quoteConfig: snapshot.quoteConfig,
                    analysisDetails: snapshot.analysisDetails ?? null,
                    aiComment: snapshot.aiComment ?? '',
                    importantExtractionNotes: snapshot.importantExtractionNotes ?? [],
                    modelUsed: snapshot.modelUsed,
                  };
                  setCurrentProject(nextProject);
                  if (currentGroup) {
                    setCurrentGroup(prev => {
                      if (!prev) return prev;
                      return prev.map(project => project.id === nextProject.id ? nextProject : project);
                    });
                  }
                  setActionHistoryForCurrent(prev => prev.slice(actionIndex + 1));
              }}
          />
          <AiNotes 
              aiComment={currentProject.aiComment} 
              importantExtractionNotes={currentProject.importantExtractionNotes}
              analysisDetails={currentProject.analysisDetails} 
          />
        </div>

        <div className="flex-grow w-full space-y-6 order-2 lg:order-1">
          {isGroupMode && (
            <Card className="border-dashed bg-muted/40">
              <CardHeader className="py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate" title={currentProject.objectName || currentProject.fileName}>
                        Группа: {currentProject.objectName || "Без названия"}
                      </CardTitle>
                      <CardDescription>
                        Редактирование нескольких смет в рамках группы.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sync-by-name"
                        checked={syncByName}
                        onCheckedChange={(checked) => setSyncByName(Boolean(checked))}
                      />
                      <Label htmlFor="sync-by-name" className="text-sm">
                        Синхронизировать позиции по названию
                      </Label>
                    </div>
                  </div>
                  <Tabs value={resolvedActiveProjectId} onValueChange={handleProjectTabChange}>
                    <TabsList className="w-full flex-wrap">
                      {currentGroup?.map((project) => (
                        <TabsTrigger
                          key={project.id}
                          value={project.id}
                          className="max-w-[16rem] truncate"
                          title={project.fileName}
                        >
                          {project.fileName || "Без названия"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
            </Card>
          )}
          <Card>
             <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="truncate" title={currentProject.fileName}>{currentProject.fileName}</CardTitle>
                        <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={() => setIsVersionDialogOpen(true)}>
                            Версия {currentProject.version || 'N/A'} {currentProject.isMainVersion && '(Основная)'}
                        </Button>
                    </div>
                     <Button variant="ghost" size="sm" onClick={onBackToProjects ? onBackToProjects : () => router.push('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4"/>К проектам</Button>
                </div>
            </CardHeader>
          </Card>

          <Accordion type="multiple" defaultValue={['calculator', 'specification']} className="w-full space-y-6">
            <AccordionItem value="ai-settings" className="border rounded-lg">
              <AiAssistantSettings 
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                temperature={temperature}
                onTemperatureChange={setTemperature}
                includeThoughts={includeThoughts}
                onThoughtsChange={setIncludeThoughts}
                onProFeatureClick={() => handleFeatureClick(false, 'PRO')}
              />
            </AccordionItem>

            <AccordionItem value="calculator" className="border rounded-lg">
               <Calculator 
                    initialProjectData={currentProject} 
                    calculatedDevices={devicesCount} 
                    calculatedCable={cableMeters} 
                    onProFeatureClick={() => handleFeatureClick(false, 'PRO')}
                    onApplyPricesFromPrivateBase={() => setIsPriceBaseDialogOpen(true)}
                    onSmrCostChange={setSmrCost}
                />
            </AccordionItem>
            
            <AccordionItem value="project-details" className="border rounded-lg">
                 <AccordionTrigger className="p-4"><CardTitle>Детали проекта</CardTitle></AccordionTrigger>
                 <AccordionContent className="p-4 pt-0">
                    <ProjectDetails 
                        analysisDetails={currentProject.analysisDetails}
                        onDetailsChange={(updates) => updateCurrentProject({ analysisDetails: { ...currentProject.analysisDetails, ...updates } })}
                    />
                 </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="quote-settings" className="border rounded-lg">
                <AccordionTrigger className="p-4"><CardTitle>Настройки КП</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <QuoteSettings 
                        projectId={currentProject.id}
                        quoteConfig={currentProject.quoteConfig || initialQuoteConfig}
                        onConfigChange={(updates) => updateCurrentProject({ quoteConfig: { ...(currentProject.quoteConfig || initialQuoteConfig), ...updates }})}
                        specItemsTotalSum={currentProject.outputSpecifications.reduce((acc, item) => acc + calculateItemSum(item, currentProject.quoteConfig || initialQuoteConfig), 0)}
                    />
                 </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="document-history" className="border rounded-lg">
                <AccordionTrigger className="p-4"><CardTitle>Документы по проекту</CardTitle></AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                   <InvoiceHistory />
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="specification" className="border rounded-lg">
                 <AccordionTrigger className="p-4"><CardTitle>Спецификация</CardTitle></AccordionTrigger>
                 <AccordionContent className="p-0 sm:p-4 pt-0">
                    <SpecificationTable 
                        specifications={currentProject.outputSpecifications.filter(item => !item.isRecommended)}
                        onUpdate={updateSpecificationItem}
                        onRemove={handleRemoveItem}
                        onAddItem={handleAddItem}
                        quoteConfig={currentProject.quoteConfig || initialQuoteConfig}
                    />
                </AccordionContent>
            </AccordionItem>
            <AiRecommendations 
                recommendedItems={currentProject.outputSpecifications.filter(item => item.isRecommended)}
                onAddRecommendation={(item) => handleAddRecommendation(item)}
                onAddAllRecommendations={handleAddAllRecommendations}
            />
          </Accordion>
        </div>
      </div>
      <AIProcessingDialog 
          isOpen={aiDialogState.isOpen}
          onClose={() => setAiDialogState(prev => ({ ...prev, isOpen: false }))}
          title={aiDialogState.title}
          description={aiDialogState.description}
          stages={aiDialogState.stages}
          result={aiDialogState.result}
          currentStage={aiDialogState.currentStage}
          onApplyResponse={handleApplyPrices}
      />
    </div>
  );
}

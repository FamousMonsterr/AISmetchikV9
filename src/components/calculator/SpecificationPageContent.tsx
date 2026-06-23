// @ts-nocheck
// src/components/calculator/SpecificationPageContent.tsx
"use client";

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext, type SpecificationItem, type HistoryRequest, type QuoteConfig, initialQuoteConfig, AnalysisDetails, ActionLog, ActionSnapshot, UserRole, Company } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mic, MicOff, Bot, Download, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveProjectVersion, updateRequest } from '@/actions/userActions';
import { createServiceRequest } from '@/actions/serviceRequestActions';
import { nanoid } from 'nanoid';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { RefineProjectDialog } from '@/components/RefineProjectDialog';
import { FindMissingDialog } from '@/components/FindMissingDialog';
import { PrivatePriceDialog } from '@/components/PrivatePriceDialog';
import { UpgradeAccountDialog } from '@/components/UpgradeAccountDialog';
import isEqual from 'lodash/isEqual';
import { collection, getDocs, query, where, doc, onSnapshot, orderBy, getDoc } from '@/lib/db-client';
import { db } from '@/lib/db';
import { ProjectUpdateDialog } from '@/components/ProjectUpdateDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { calculateItemSum, calculateProjectTotals } from '@/lib/calculation';
import { suggestItemPrices } from '@/ai/flows/suggest-item-prices-flow';
import { AIProcessingDialog } from '@/components/AIProcessingDialog';
import { getDefaultModel, getVoiceModel, generateJson } from '@/services/ai';
import aiConstructorConfig from '@/lib/ai-constructor-config.json';
import { PlanBadge } from '@/components/PlanBadge';
import { getPlanModelOptions, resolvePlanModelId } from '@/lib/plan-models';
import { getProjectDisplayName, getProjectVersionLabel } from '@/lib/project-labels';

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
import { ProcessingDialog } from '@/components/ProcessingDialog';
import { GroupZipDialog } from '@/components/GroupZipDialog';
import { classifyItemType } from '@/lib/item-type-classifier';



export const dynamic = 'force-dynamic';

interface SpecificationPageContentProps {
    onBackToProjects?: () => void;
    variant?: 'default' | 'pwa';
}

type SyncPriceOption = {
  key: string;
  projectId: string;
  projectName: string;
  materialPrice: number | null;
  installationPrice: number | null;
};

type SyncPriceConflict = {
  name: string;
  options: SyncPriceOption[];
};

export default function SpecificationPageContent({ onBackToProjects, variant = 'default' }: SpecificationPageContentProps) {
  const router = useRouter();
  const { user, currentProject, setCurrentProject, currentGroup, setCurrentGroup, effectivePlan, resetAppContextState, isNavigating, setNavigating } = useAppContext();
  const { toast } = useToast();
  
  const [isSaving, startSavingTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [isAiEditPending, startAiEditTransition] = useTransition();
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSaveSnapshotRef = useRef<Record<string, string | null>>({});
  const lastAutoSaveAtRef = useRef<Record<string, number>>({});
  const isAutoSavingRef = useRef<Record<string, boolean>>({});
  const groupFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastComplexityMultiplierRef = useRef<number | null>(null);

  const [initialProjectStates, setInitialProjectStates] = useState<Record<string, HistoryRequest>>({});

  const [isRefineDialogOpen, setIsRefineDialogOpen] = useState(false);
  const [refineAction, setRefineAction] = useState<'refine' | 'fill-empty'>('refine');
  const [isFindMissingDialogOpen, setIsFindMissingDialogOpen] = useState(false);
  const [isPriceBaseDialogOpen, setIsPriceBaseDialogOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Business' | 'Enterprise'>('PRO');
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [actionHistoryByProject, setActionHistoryByProject] = useState<Record<string, ActionLog[]>>({});

  // AI settings state moved up to the parent
  const [selectedModel, setSelectedModel] = useState(currentProject?.modelUsed || '');
  const [includeThoughts, setIncludeThoughts] = useState(false);
  const [aiDialogState, setAiDialogState] = useState<{ isOpen: boolean; title: string; description: string; stages: { key: string; text: string }[], result: { success: boolean; message: string; rawResponse?: any; requestDetails?: any; } | null; currentStage?: string; }>({
    isOpen: false,
    title: '',
    description: '',
    stages: [],
    result: null,
  });

  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState<SyncPriceConflict[]>([]);
  const [syncSelections, setSyncSelections] = useState<Record<string, string>>({});
  const [syncScope, setSyncScope] = useState<'group' | 'current'>('group');
  const [groupUploadFile, setGroupUploadFile] = useState<File | null>(null);
  const [isGroupProcessingOpen, setIsGroupProcessingOpen] = useState(false);
  const [isGroupZipDialogOpen, setIsGroupZipDialogOpen] = useState(false);
  const [isAiEditDialogOpen, setIsAiEditDialogOpen] = useState(false);
  const [aiEditText, setAiEditText] = useState('');
  const [isAiEditRecording, setIsAiEditRecording] = useState(false);
  const [isAiEditTranscribing, setIsAiEditTranscribing] = useState(false);
  const [calculatorUpdates, setCalculatorUpdates] = useState<{ manualSmrCost?: number | null; complexityMultiplier?: number | null } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const aiEditStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isGroupWorkEnabled, setIsGroupWorkEnabled] = useState(() => (currentGroup?.length ?? 0) > 1);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(currentProject?.id ?? currentGroup?.[0]?.id ?? null);
  const isGroupMode = (currentGroup?.length ?? 0) > 1;
  const isGroupWorkActive = isGroupMode && isGroupWorkEnabled;
  const initialProjectState = currentProject ? (initialProjectStates[currentProject.id] ?? null) : null;
  const actionHistory = useMemo(() => {
    if (!currentProject) return [];
    return actionHistoryByProject[currentProject.id] ?? [];
  }, [actionHistoryByProject, currentProject?.id]);
  const isPro = effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise';
  const canSelectModel = effectivePlan === 'Business' || effectivePlan === 'Enterprise';
  const planKey = effectivePlan === 'PRO' ? 'pro' : 'free';
  const planPreference = user?.planModelPreferences?.[planKey];
  const planModelOptions = useMemo(() => getPlanModelOptions(effectivePlan), [effectivePlan]);
  const planModelIds = useMemo(() => planModelOptions.map((model: any) => model.value), [planModelOptions]);
  const resolvedPlanModel = useMemo(() => resolvePlanModelId(effectivePlan, planPreference), [effectivePlan, planPreference]);
  const proButtonClass = isPro ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "";
  const withProLabel = (label: string) => isPro ? label : `${label} (PRO)`;
  const groupActionButtonClass = cn(
    "bg-muted/60 border-muted-foreground/30 text-foreground/80 hover:bg-muted/70 dark:bg-muted/30 dark:text-foreground/90 dark:hover:bg-muted/40",
    isPro && "bg-amber-100/90 border-amber-400/80 text-amber-950 hover:bg-amber-200/90 dark:bg-amber-950/40 dark:border-amber-900/70 dark:text-amber-200"
  );

  const canUsePrivatePriceBase = user ? user.canUsePrivatePriceBase : false;

  // Cleanup MediaRecorder and stream on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      aiEditStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isGroupMode && isGroupWorkEnabled) {
      setIsGroupWorkEnabled(false);
    }
  }, [isGroupMode, isGroupWorkEnabled]);

  const calculateSmrFromSpecs = (specs: SpecificationItem[]) => {
    return specs.reduce((sum, item) => {
      if (item.isInformational) return sum;
      const installation = (item.installationPrice || 0) * (item.quantityToInstall || 0);
      return sum + installation;
    }, 0);
  };

  const groupSmrTotal = useMemo(() => {
    if (!isGroupWorkActive || !currentGroup) return null;
    return currentGroup.reduce((acc, project) => acc + calculateSmrFromSpecs(project.outputSpecifications), 0);
  }, [isGroupWorkActive, currentGroup]);

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

  const MAX_ACTION_HISTORY = 10;

  const setActionHistoryForCurrent = useCallback((updater: ((prev: ActionLog[]) => ActionLog[]) | ActionLog[]) => {
    if (!currentProject) return;
    setActionHistoryByProject(prev => {
      const currentList = prev[currentProject.id] ?? [];
      const nextList = typeof updater === 'function' ? updater(currentList) : updater;
      return { ...prev, [currentProject.id]: nextList };
    });
  }, [currentProject?.id]);

  const persistActionHistory = useCallback(async (projectId: string, history: ActionLog[]) => {
    if (!user) return;
    try {
      await updateRequest({
        requestIds: [projectId],
        userId: user.uid,
        updates: { actionHistory: history },
      });
    } catch (error) {
      console.error("Failed to persist action history:", error);
    }
  }, [user]);

  const logActionForProject = useCallback((project: HistoryRequest, description: string, persist = false) => {
    const newAction: ActionLog = { id: nanoid(), timestamp: new Date(), description, snapshot: buildSnapshot(project) };
    const currentList = actionHistoryByProject[project.id] ?? [];
    const nextList = [newAction, ...currentList].slice(0, MAX_ACTION_HISTORY);
    setActionHistoryByProject(prev => ({ ...prev, [project.id]: nextList }));
    if (persist) {
      persistActionHistory(project.id, nextList);
    }
  }, [actionHistoryByProject, persistActionHistory]);

  const logAction = (description: string, snapshot: ActionSnapshot) => {
    const newAction: ActionLog = { id: nanoid(), timestamp: new Date(), description, snapshot };
    setActionHistoryForCurrent(prev => [newAction, ...prev].slice(0, MAX_ACTION_HISTORY));
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

  const handleAiProjectUpdate = (nextProject: HistoryRequest, description: string) => {
    const previousProject = currentGroup?.find(project => project.id === nextProject.id)
      ?? (currentProject?.id === nextProject.id ? currentProject : null);
    if (previousProject) {
      logActionForProject(previousProject, description, true);
    }
    setCurrentProject(nextProject);
    if (currentGroup) {
      setCurrentGroup(prev => prev ? prev.map(project => project.id === nextProject.id ? nextProject : project) : prev);
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
          })).slice(0, MAX_ACTION_HISTORY)
        : [];
      return { ...prev, [currentProject.id]: seededHistory };
    });
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentProject) return;
    let nextModel = currentProject.modelUsed || '';
    if (!canSelectModel) {
      nextModel = resolvedPlanModel;
    } else if (planModelIds.length > 0 && !planModelIds.includes(nextModel)) {
      nextModel = planModelIds.includes(resolvedPlanModel) ? resolvedPlanModel : planModelIds[0];
    }
    if (nextModel && nextModel !== selectedModel) {
      setSelectedModel(nextModel);
    }
    if (nextModel && nextModel !== currentProject.modelUsed) {
      updateCurrentProject({ modelUsed: nextModel }, `Модель AI установлена на ${nextModel}`);
    }
  }, [currentProject?.id, canSelectModel, resolvedPlanModel, planModelIds, selectedModel, updateCurrentProject]);

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
      if (!canSelectModel) return;
      setSelectedModel(model);
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

  const handleGroupFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    setGroupUploadFile(file);
    setIsGroupProcessingOpen(true);
  };

  const handleGroupProcessingClose = () => {
    setIsGroupProcessingOpen(false);
    setGroupUploadFile(null);
    if (groupFileInputRef.current) {
      groupFileInputRef.current.value = '';
    }
  };

  const handleGroupProjectProcessed = (project: HistoryRequest) => {
    setCurrentGroup(prev => {
      if (!prev) return [project];
      if (prev.some(existing => existing.id === project.id)) return prev;
      return [...prev, project];
    });
    setCurrentProject(project);
    setActiveProjectId(project.id);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || typeof value !== 'number' || Number.isNaN(value)) return '—';
    return `${value.toLocaleString('ru-RU')} ₽`;
  };

  const buildSyncConflicts = (): SyncPriceConflict[] => {
    if (!currentGroup) return [];
    const grouped = new Map<string, Map<string, SyncPriceOption>>();

    currentGroup.forEach(project => {
      project.outputSpecifications.forEach(item => {
        if (item.isInformational) return;
        const name = item.name?.trim();
        if (!name) return;
        const materialPrice = typeof item.materialPrice === 'number' ? item.materialPrice : null;
        const installationPrice = typeof item.installationPrice === 'number' ? item.installationPrice : null;
        const key = `${materialPrice ?? 'null'}|${installationPrice ?? 'null'}`;
        if (!grouped.has(name)) {
          grouped.set(name, new Map());
        }
        const options = grouped.get(name)!;
        if (!options.has(key)) {
          options.set(key, {
            key,
            projectId: project.id,
            projectName: project.fileName || project.id,
            materialPrice,
            installationPrice,
          });
        }
      });
    });

    return Array.from(grouped.entries())
      .map(([name, optionsMap]) => ({
        name,
        options: Array.from(optionsMap.values()),
      }))
      .filter(conflict => conflict.options.length > 1);
  };

  const handleOpenSyncDialog = () => {
    if (!currentGroup) return;
    const conflicts = buildSyncConflicts();
    if (conflicts.length === 0) {
      toast({ title: "Синхронизация не требуется", description: "Конфликтующих цен по одинаковым названиям не найдено." });
      return;
    }
    setSyncScope(isGroupWorkActive ? 'group' : 'current');
    const defaults: Record<string, string> = {};
    conflicts.forEach(conflict => {
      const currentOption = conflict.options.find(option => option.projectId === currentProject?.id);
      defaults[conflict.name] = currentOption?.key || conflict.options[0].key;
    });
    setSyncSelections(defaults);
    setSyncConflicts(conflicts);
    setIsSyncDialogOpen(true);
  };

  const handleApplySync = () => {
    if (!currentGroup || syncConflicts.length === 0) {
      setIsSyncDialogOpen(false);
      return;
    }
    if (currentProject) {
      logAction("Синхронизированы цены по группе", buildSnapshot(currentProject));
    }
    const targetProjectIds = syncScope === 'current'
      ? new Set([currentProject?.id].filter(Boolean))
      : null;
    const conflictMap = new Map(syncConflicts.map(conflict => [conflict.name, conflict]));
    const updatedGroup = currentGroup.map(project => {
      if (targetProjectIds && !targetProjectIds.has(project.id)) {
        return project;
      }
      const updatedSpecs = project.outputSpecifications.map(item => {
        if (item.isInformational) return item;
        const name = item.name?.trim();
        if (!name || !conflictMap.has(name)) return item;
        const conflict = conflictMap.get(name)!;
        const selectionKey = syncSelections[name] || conflict.options[0].key;
        const selected = conflict.options.find(option => option.key === selectionKey) || conflict.options[0];
        return {
          ...item,
          materialPrice: selected.materialPrice,
          installationPrice: selected.installationPrice,
        };
      });
      return { ...project, outputSpecifications: updatedSpecs };
    });
    setCurrentGroup(updatedGroup);
    const updatedCurrent = updatedGroup.find(project => project.id === currentProject?.id);
    if (updatedCurrent) {
      setCurrentProject(updatedCurrent);
    }
    setIsSyncDialogOpen(false);
    toast({
      title: "Цены синхронизированы",
      description: syncScope === 'group'
        ? `Обновлено позиций: ${syncConflicts.length} (вся группа).`
        : `Обновлено позиций: ${syncConflicts.length} (текущая вкладка).`,
    });
  };

  const updateSpecificationItem = (itemId: string, updates: Partial<SpecificationItem>) => {
    if (!currentProject) return;
    const oldSpecs = currentProject.outputSpecifications;

    const oldItem = oldSpecs.find(i => i.id === itemId);
    const matchName = oldItem?.name?.trim();
    const shouldSyncByName = !!(isGroupWorkActive && matchName && !oldItem?.isInformational && currentGroup);

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

  const applyComplexityMultiplier = useCallback((nextMultiplier: number) => {
    if (!currentProject || !Number.isFinite(nextMultiplier) || nextMultiplier <= 0) return;
    const prevMultiplier = lastComplexityMultiplierRef.current ?? 1;
    if (Math.abs(prevMultiplier - nextMultiplier) < 0.0001) {
      lastComplexityMultiplierRef.current = nextMultiplier;
      return;
    }

    const ratio = nextMultiplier / prevMultiplier;
    const adjustSpecs = (specs: SpecificationItem[]) => specs.map(item => {
      if (item.isInformational) return item;
      const basePrice = item.installationPrice || 0;
      const nextPrice = parseFloat((basePrice * ratio).toFixed(2));
      return { ...item, installationPrice: nextPrice };
    });

    if (isGroupWorkActive && currentGroup) {
      currentGroup.forEach(project => {
        logActionForProject(project, `Коэффициент сложности x${nextMultiplier.toFixed(2)} применен`, true);
      });
      const updatedGroup = currentGroup.map(project => ({
        ...project,
        outputSpecifications: adjustSpecs(project.outputSpecifications),
      }));
      setCurrentGroup(updatedGroup);
      const updatedCurrent = updatedGroup.find(project => project.id === currentProject.id);
      if (updatedCurrent) {
        setCurrentProject(updatedCurrent);
      }
    } else {
      logActionForProject(currentProject, `Коэффициент сложности x${nextMultiplier.toFixed(2)} применен`, true);
      updateCurrentProject({ outputSpecifications: adjustSpecs(currentProject.outputSpecifications) });
    }

    lastComplexityMultiplierRef.current = nextMultiplier;
  }, [currentProject, currentGroup, isGroupWorkActive, logActionForProject, updateCurrentProject]);

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
                    setNavigating(true);
                    router.push('/dashboard');
                 }
             }
        } else {
             toast({title: "Ошибка сохранения", description: result.message, variant: "destructive"});
        }
    });
  };
  

  const handleFeatureClick = (isAllowed: boolean, requiredRole: 'PRO' | 'Business' | 'Enterprise') => {
      if (!isAllowed) {
          setUpgradeTargetRole(requiredRole);
          setIsUpgradeModalOpen(true);
      }
  };

  const handleS3Request = () => {
    if (!user) return;
    startActionTransition(async () => {
      const result = await createServiceRequest({
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        type: 's3_storage',
        payload: { source: 'private_price_dialog' },
      });
      if (result.success) {
        toast({ title: 'Заявка отправлена', description: result.message });
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const [smrCost, setSmrCost] = useState(0);

 const handleAIPricing = () => {
    if (!currentProject) return;

    const useGroupScope = isGroupWorkActive && currentGroup;
    const targets = useGroupScope ? currentGroup : [currentProject];
    const unapprovedProjects = targets.filter(project =>
      project.outputSpecifications.some(item => !item.isInformational && item.status !== 'Утверждено')
    );

    if (unapprovedProjects.length > 0) {
        const listPreview = unapprovedProjects
          .slice(0, 3)
          .map(project => project.fileName || project.id)
          .join(', ');
        toast({
            title: "Требуется утверждение",
            description: `Утвердите все позиции в ${unapprovedProjects.length} проект(ах). ${listPreview}${unapprovedProjects.length > 3 ? '…' : ''}`,
            variant: "destructive",
        });
        return;
    }

    setAiDialogState({
        isOpen: true,
        title: "Запрос цен у AI",
        description: useGroupScope
          ? `Распределение стоимости для группы (${targets.length} проектов).`
          : "Распределение общей стоимости по позициям...",
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
            setAiDialogState(prev => ({...prev, currentStage: 'prep'}));
            const serviceModelId = await getDefaultModel();
            const itemsToPrice = useGroupScope
              ? targets.flatMap(project => project.outputSpecifications
                  .filter(item => !item.isInformational)
                  .map(item => ({
                    id: `${project.id}::${item.id}`,
                    name: item.name,
                    model: item.model || '',
                    brand: item.brand || '',
                    unit: item.unit,
                    quantity: item.quantityToInstall || 0,
                    itemType: item.itemType,
                  }))
                )
              : currentProject.outputSpecifications
                  .filter(item => !item.isInformational)
                  .map(item => ({
                    id: item.id,
                    name: item.name,
                    model: item.model || '',
                    brand: item.brand || '',
                    unit: item.unit,
                    quantity: item.quantityToInstall || 0,
                    itemType: item.itemType,
                  }));

            const groupedItems = useGroupScope
              ? targets.map(project => ({
                  projectId: project.id,
                  projectName: project.fileName || project.analysisDetails?.objectName || project.id,
                  items: project.outputSpecifications
                    .filter(item => !item.isInformational)
                    .map(item => ({
                      id: `${project.id}::${item.id}`,
                      name: item.name,
                      model: item.model || '',
                      brand: item.brand || '',
                      unit: item.unit,
                      quantity: item.quantityToInstall || 0,
                      itemType: item.itemType,
                    })),
                }))
              : null;

            if (itemsToPrice.length === 0) {
                throw new Error("Спецификация пуста, нет позиций для оценки.");
            }

            const totalSmrCost = useGroupScope ? (groupSmrTotal || 0) : smrCost;
            if (totalSmrCost <= 0) {
              throw new Error("Сумма СМР должна быть больше 0.");
            }

            const pricingAnalysisDetails = useGroupScope
              ? targets.map(project => ({
                  projectId: project.id,
                  fileName: project.fileName,
                  analysisDetails: project.analysisDetails || null,
                }))
              : (currentProject.analysisDetails || null);

            const pricingQuoteConfig = useGroupScope
              ? targets.map(project => ({
                  projectId: project.id,
                  fileName: project.fileName,
                  quoteConfig: project.quoteConfig || initialQuoteConfig,
                }))
              : (currentProject.quoteConfig || initialQuoteConfig);

            const pricingCalculatorInputs = {
              complexityMultiplier: lastComplexityMultiplierRef.current ?? 1,
              maxInstallationHeight: currentProject.analysisDetails?.maxInstallationHeight || null,
              groupMode: Boolean(useGroupScope),
              projectsInScope: targets.length,
            };

            setAiDialogState(prev => ({...prev, currentStage: 'ai'}));
            const result = await generateJson({
                prompt: aiConstructorConfig.prompts.find(p => p.id === 'suggestPricesPrompt')?.promptText || '',
                model: serviceModelId,
                items: itemsToPrice,
                groupedItems,
                totalSmrCost,
                currency: 'RUB',
                analysisDetails: pricingAnalysisDetails,
                quoteConfig: pricingQuoteConfig,
                calculatorInputs: pricingCalculatorInputs,
            });
            
            setAiDialogState(prev => ({
              ...prev,
              result: {
                success: true,
                message: "Ответ получен. Проверьте и примените.",
                rawResponse: result.rawResponse,
                requestDetails: result.requestDetails,
              },
            }));

        } catch (error: any) {
            console.error("AI Pricing Error:", error);
            const errorMessage = error.message || "Произошла неизвестная ошибка.";
            setAiDialogState(prev => ({ ...prev, result: { success: false, message: errorMessage, rawResponse: error } }));
        }
    });
  };
  
  const handleApplyPrices = (rawResponse: any) => {
    const parsePricedItems = (response: any) => {
      let pricedItems;
      try {
          let textToParse: string;

          if (typeof response === 'string') {
              textToParse = response;
          } else if (response && response.choices && response.choices[0]?.message?.content) {
              textToParse = response.choices[0].message.content;
          } else if (typeof response?.text === 'string') {
              textToParse = response.text;
          } else {
               throw new Error("Не удалось найти текстовое содержимое в ответе AI.");
          }
          
          const jsonMatch = textToParse.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
          if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
              const jsonString = jsonMatch[1] || jsonMatch[2];
              const content = JSON.parse(jsonString);
              pricedItems = content.pricedItems;
          } else {
              const content = JSON.parse(textToParse);
              pricedItems = content.pricedItems;
          }

          if (!pricedItems || !Array.isArray(pricedItems)) {
              throw new Error("Ответ AI не содержит корректного массива 'pricedItems'.");
          }

          return pricedItems;
      } catch (e: any) {
          console.error("Failed to parse AI response for pricing:", e);
          throw e;
      }
    };

    if (!currentProject) return;

    setAiDialogState(prev => ({ ...prev, currentStage: 'apply' }));

    let pricedItems;
    try {
      pricedItems = parsePricedItems(rawResponse);
    } catch (e: any) {
      toast({ title: "Ошибка парсинга", description: `Не удалось обработать ответ от AI: ${e.message}`, variant: "destructive" });
      setAiDialogState(prev => ({...prev, isOpen: false}));
      return;
    }

    if (isGroupWorkActive && currentGroup) {
      currentGroup.forEach(project => {
        logActionForProject(project, "Применены цены от AI", true);
      });

      const updatesMap = new Map<string, { installationPrice?: number; aiPriceComment?: string }>();
      pricedItems.forEach((priced: any) => {
        const rawId = String(priced.id || '');
        const [projectId, itemId] = rawId.split('::');
        if (!projectId || !itemId) return;
        updatesMap.set(`${projectId}::${itemId}`, {
          installationPrice: priced.suggestedInstallationPrice,
          aiPriceComment: priced.aiPriceComment,
        });
      });

      const updatedGroup = currentGroup.map(project => {
        const nextSpecs = project.outputSpecifications.map(item => {
          const key = `${project.id}::${item.id}`;
          if (!updatesMap.has(key)) return item;
          const update = updatesMap.get(key)!;
          const newPrice = typeof update.installationPrice === 'number' ? update.installationPrice : item.installationPrice;
          const newComment = [item.comment, update.aiPriceComment].filter(Boolean).join('. ');
          return { ...item, installationPrice: newPrice, comment: newComment, status: 'На утверждение' as const };
        });
        return { ...project, outputSpecifications: nextSpecs };
      });

      setCurrentGroup(updatedGroup);
      const updatedCurrent = updatedGroup.find(project => project.id === currentProject.id);
      if (updatedCurrent) {
        setCurrentProject(updatedCurrent);
      }
      toast({ title: "Цены применены!", description: "AI-цены распределены по всем проектам группы." });
      setAiDialogState(prev => ({...prev, isOpen: false}));
      return;
    }
    
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

    logActionForProject(currentProject, "Применены цены от AI", true);
    updateCurrentProject({ outputSpecifications: updatedSpecs });
    
    toast({ title: "Цены применены!", description: "Цены на монтаж распределены. Проверьте и утвердите новые цены." });
    setAiDialogState(prev => ({...prev, isOpen: false}));
  };

  const { devicesCount, cableMeters, cableSupportMeters } = useMemo(() => {
    if (!currentProject) return { devicesCount: 0, cableMeters: 0, cableSupportMeters: 0 };
    
    let devices = 0;
    let cable = 0;
    let cableSupport = 0;

    currentProject.outputSpecifications.forEach((item: SpecificationItem) => {
        if (item.isInformational) return;
        if (item.itemType === 'device') devices += item.quantityToInstall || 0;
        if (item.itemType === 'cable') cable += item.quantityToInstall || 0;
        if (item.itemType === 'cable_support') cableSupport += item.quantityToInstall || 0;
    });
    
    return { devicesCount: devices, cableMeters: cable, cableSupportMeters: cableSupport };

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
    return { ...item, itemType: classifyItemType(item.name, item.unit) };
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
    if (isGroupWorkActive && currentGroup) {
      currentGroup.forEach(project => {
        logActionForProject(project, "Добавлены найденные позиции (AI)", true);
      });
      let totalAdded = 0;
      const updatedGroup = currentGroup.map(project => {
        const existingKeys = new Set(
          project.outputSpecifications
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
          return project;
        }

        totalAdded += dedupedItems.length;
        const nextSpecs = [...project.outputSpecifications];
        dedupedItems.forEach(item => {
          const insertIndex = findInsertionIndex(nextSpecs, item);
          nextSpecs.splice(insertIndex, 0, {
            ...item,
            id: nanoid(),
            status: 'На утверждение' as const,
          });
        });
        return { ...project, outputSpecifications: nextSpecs };
      });

      setCurrentGroup(updatedGroup);
      const updatedCurrent = updatedGroup.find(project => project.id === currentProject.id);
      if (updatedCurrent) {
        setCurrentProject(updatedCurrent);
      }
      if (totalAdded === 0) {
        toast({ title: "Новых позиций нет", description: "Все найденные позиции уже есть в спецификациях группы." });
      } else {
        toast({ title: "Позиции добавлены", description: `Добавлено ${totalAdded} новых позиций в группу.` });
      }
      setIsFindMissingDialogOpen(false);
      return;
    }

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

    logActionForProject(currentProject, `Добавлены найденные позиции (AI)`, true);
    updateCurrentProject({ outputSpecifications: nextSpecs });
    toast({ title: "Позиции добавлены", description: `${dedupedItems.length} новых позиций добавлены в спецификацию.` });
    setIsFindMissingDialogOpen(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const transcribeAiEditAudio = async (audioBlob: Blob) => {
    setIsAiEditTranscribing(true);
    try {
      const modelId = await getVoiceModel();
      if (!modelId) {
        throw new Error('Голосовая модель не настроена. Выберите модель в админ панели.');
      }
      const base64Data = await blobToBase64(audioBlob);
      const prompt = [
        "Ты — помощник, который расшифровывает аудио с голосовыми правками сметы.",
        "Верни строго JSON без markdown:",
        "{\"text\": \"...\"}",
        "Текст верни на русском, без лишних пояснений."
      ].join("\n");
      const result = await generateJson({
        prompt,
        model: modelId,
        file: {
          fileUri: base64Data,
          mimeType: audioBlob.type || 'audio/webm',
          fileName: 'voice.webm',
        },
        responseMimeType: 'application/json',
      });
      const rawText = result.text || '';
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.text) {
        setAiEditText(prev => (prev ? `${prev} ${parsed.text}` : parsed.text).trim());
      }
    } catch (error: any) {
      console.error("Voice transcription error:", error);
      toast({ title: "Ошибка распознавания", description: error?.message || "Не удалось распознать голос.", variant: "destructive" });
    } finally {
      setIsAiEditTranscribing(false);
    }
  };

  const startAiEditRecording = async () => {
    if (!isPro) {
      handleFeatureClick(false, 'PRO');
      return;
    }
    if (isAiEditRecording || isAiEditTranscribing) return;
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      toast({ title: "Голосовой ввод недоступен", description: "Браузер не поддерживает запись аудио.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aiEditStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        aiEditStreamRef.current?.getTracks().forEach(track => track.stop());
        aiEditStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsAiEditRecording(false);
        if (audioBlob.size > 0) {
          transcribeAiEditAudio(audioBlob);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsAiEditRecording(true);
    } catch (error) {
      toast({ title: "Не удалось запустить запись", description: "Проверьте доступ к микрофону.", variant: "destructive" });
      setIsAiEditRecording(false);
    }
  };

  const stopAiEditRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (!isAiEditDialogOpen && isAiEditRecording) {
      stopAiEditRecording();
    }
  }, [isAiEditDialogOpen, isAiEditRecording]);

  const applyAiEdits = (payload: any) => {
    if (!currentProject) return;
    const updates = payload?.updates || payload;
    if (!updates) return;

    const normalizeNumber = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    };

    const applyUpdatesToProject = (project: HistoryRequest) => {
      let nextSpecs = [...project.outputSpecifications];
      const findSpecIndex = (target: any) => {
        if (target?.id) {
          const indexById = nextSpecs.findIndex(spec => spec.id === target.id);
          if (indexById !== -1) return indexById;
        }
        if (target?.name) {
          const lookup = String(target.name).trim().toLowerCase();
          return nextSpecs.findIndex(spec => spec.name?.trim().toLowerCase() === lookup);
        }
        return -1;
      };

      if (Array.isArray(updates.specRemovals)) {
        const removalIds = new Set(
          updates.specRemovals
            .map((removal: any) => {
              const index = findSpecIndex(removal);
              return index >= 0 ? nextSpecs[index]?.id : null;
            })
            .filter(Boolean),
        );
        nextSpecs = nextSpecs.filter(spec => !removalIds.has(spec.id));
      }

      if (Array.isArray(updates.specUpdates)) {
        updates.specUpdates.forEach((update: any) => {
          const index = findSpecIndex(update);
          if (index === -1) return;
          const updatesPayload = update.updates || {};
          const normalized = { ...updatesPayload };
          if ('quantityToInstall' in normalized) normalized.quantityToInstall = normalizeNumber(normalized.quantityToInstall);
          if ('quantityReserve' in normalized) normalized.quantityReserve = normalizeNumber(normalized.quantityReserve);
          if ('materialPrice' in normalized) normalized.materialPrice = normalizeNumber(normalized.materialPrice);
          if ('installationPrice' in normalized) normalized.installationPrice = normalizeNumber(normalized.installationPrice);
          nextSpecs[index] = {
            ...nextSpecs[index],
            ...normalized,
          };
        });
      }

      if (Array.isArray(updates.specAdds)) {
        updates.specAdds.forEach((item: any) => {
          if (!item?.name) return;
          nextSpecs.push({
            id: nanoid(),
            name: String(item.name),
            model: item.model ?? '',
            brand: item.brand ?? '',
            quantityToInstall: Number(item.quantityToInstall ?? 1),
            quantityReserve: normalizeNumber(item.quantityReserve) ?? 0,
            unit: item.unit || 'шт',
            status: 'На утверждение',
            materialPrice: normalizeNumber(item.materialPrice) ?? 0,
            installationPrice: normalizeNumber(item.installationPrice) ?? 0,
            comment: item.comment || '',
            isInformational: false,
            isRecommended: false,
            itemType: ['device', 'cable', 'cable_support', 'consumable', 'other'].includes(item.itemType) ? item.itemType : 'other',
          });
        });
      }

      const nextQuoteConfig = updates.quoteConfig
        ? { ...(project.quoteConfig || initialQuoteConfig), ...updates.quoteConfig }
        : project.quoteConfig;
      const nextAnalysisDetails = updates.analysisDetails
        ? { ...(project.analysisDetails || {}), ...updates.analysisDetails }
        : project.analysisDetails;

      return {
        ...project,
        outputSpecifications: nextSpecs,
        quoteConfig: nextQuoteConfig,
        analysisDetails: nextAnalysisDetails,
      };
    };

    if (isGroupWorkActive && currentGroup) {
      currentGroup.forEach(project => {
        logActionForProject(project, "AI-правки применены", true);
      });
      const updatedGroup = currentGroup.map(project => applyUpdatesToProject(project));
      setCurrentGroup(updatedGroup);
      const updatedCurrent = updatedGroup.find(project => project.id === currentProject.id);
      if (updatedCurrent) {
        setCurrentProject(updatedCurrent);
      }
    } else {
      logActionForProject(currentProject, "AI-правки применены", true);
      const updatedProject = applyUpdatesToProject(currentProject);
      updateCurrentProject({
        outputSpecifications: updatedProject.outputSpecifications,
        quoteConfig: updatedProject.quoteConfig,
        analysisDetails: updatedProject.analysisDetails,
      });
    }

    if (updates.calculator) {
      setCalculatorUpdates({
        manualSmrCost: updates.calculator.manualSmrCost,
        complexityMultiplier: updates.calculator.complexityMultiplier,
      });
    }
  };

  const handleAiEditSubmit = () => {
    if (!currentProject || !aiEditText.trim()) {
      toast({ title: "Нужно описание", description: "Введите или надиктуйте правки для проекта.", variant: "destructive" });
      return;
    }

    startAiEditTransition(async () => {
      try {
        const modelId = selectedModel || await getDefaultModel();
        const promptTemplate = aiConstructorConfig.prompts.find(p => p.id === 'projectEditPrompt')?.promptText || '';
        const projectContext = isGroupWorkActive && currentGroup
          ? {
              group: currentGroup.map(project => ({
                project: {
                  id: project.id,
                  fileName: project.fileName,
                  analysisDetails: project.analysisDetails,
                  quoteConfig: project.quoteConfig || initialQuoteConfig,
                },
                specifications: project.outputSpecifications.map(item => ({
                  id: item.id,
                  name: item.name,
                  model: item.model,
                  brand: item.brand,
                  quantityToInstall: item.quantityToInstall,
                  quantityReserve: item.quantityReserve,
                  unit: item.unit,
                  materialPrice: item.materialPrice,
                  installationPrice: item.installationPrice,
                  itemType: item.itemType,
                  comment: item.comment,
                  isInformational: item.isInformational || false,
                })),
              })),
            }
          : {
              project: {
                id: currentProject.id,
                fileName: currentProject.fileName,
                analysisDetails: currentProject.analysisDetails,
                quoteConfig: currentProject.quoteConfig || initialQuoteConfig,
              },
              specifications: currentProject.outputSpecifications.map(item => ({
                id: item.id,
                name: item.name,
                model: item.model,
                brand: item.brand,
                quantityToInstall: item.quantityToInstall,
                quantityReserve: item.quantityReserve,
                unit: item.unit,
                materialPrice: item.materialPrice,
                installationPrice: item.installationPrice,
                itemType: item.itemType,
                comment: item.comment,
                isInformational: item.isInformational || false,
              })),
            };

        const prompt = promptTemplate
          .replace('{{instructions}}', aiEditText.trim())
          .replace('{{projectContext}}', JSON.stringify(projectContext, null, 2));

        const result = await generateJson({ prompt, model: modelId });
        const rawText = result.text || '';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        applyAiEdits(parsed);
        setIsAiEditDialogOpen(false);
        setAiEditText('');
        toast({ title: "AI-правки применены", description: "Проверьте изменения в проекте." });
      } catch (error: any) {
        console.error("AI edit error:", error);
        toast({ title: "Ошибка AI-правок", description: error?.message || "Не удалось применить правки.", variant: "destructive" });
      }
    });
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
  
  const isPwa = variant === 'pwa';

  return (
    <div className={cn("w-full transition-colors", isGroupWorkActive && "bg-blue-50/20 dark:bg-blue-950/20", isPwa && "pwa-panel")}>
      <UpgradeAccountDialog isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} targetRole={upgradeTargetRole} />
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Синхронизация цен по группе</DialogTitle>
            <DialogDescription>
              Найдены позиции с одинаковыми названиями, но разными ценами. Выберите, какие цены применить.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-sm font-medium">Применить цены</div>
            <RadioGroup
              value={syncScope}
              onValueChange={(value) => setSyncScope(value as 'group' | 'current')}
              className="mt-2 flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="sync-scope-group" />
                <Label htmlFor="sync-scope-group">Вся группа</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="sync-scope-current" />
                <Label htmlFor="sync-scope-current">Текущая вкладка</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {syncConflicts.map((conflict) => (
              <div key={conflict.name} className="rounded-lg border p-3">
                <div className="font-medium">{conflict.name}</div>
                <RadioGroup
                  value={syncSelections[conflict.name]}
                  onValueChange={(value) => setSyncSelections(prev => ({ ...prev, [conflict.name]: value }))}
                  className="mt-2 space-y-2"
                >
                  {conflict.options.map(option => {
                    const optionId = `sync-${conflict.name}-${option.projectId}-${option.key}`;
                    return (
                      <div key={option.key} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
                        <RadioGroupItem value={option.key} id={optionId} />
                        <Label htmlFor={optionId} className="flex flex-col text-sm font-normal">
                          <span className="font-medium">{option.projectName}</span>
                          <span className="text-xs text-muted-foreground">
                            МТР: {formatCurrency(option.materialPrice)} · СМР: {formatCurrency(option.installationPrice)}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleApplySync}>Применить синхронизацию</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAiEditDialogOpen} onOpenChange={setIsAiEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-правки проекта</DialogTitle>
            <DialogDescription>
              Опишите правки голосом или текстом. Например: «Сделай коэффициент сложности 1.2, добавь ПНР 15 000, увеличь цену монтажа камер до 2500».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={isAiEditRecording ? stopAiEditRecording : startAiEditRecording}
                disabled={isAiEditTranscribing}
              >
                {isAiEditRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isAiEditRecording ? "Остановить запись" : "Говорить"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {isAiEditRecording
                  ? "Идет запись..."
                  : isAiEditTranscribing
                    ? "Идет распознавание голоса..."
                    : "Микрофон доступен, если поддерживается браузером."}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-edit-text">Текст правок</Label>
              <Textarea
                id="ai-edit-text"
                value={aiEditText}
                onChange={(e) => setAiEditText(e.target.value)}
                rows={6}
                placeholder="Опишите правки для проекта..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAiEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAiEditSubmit} disabled={isAiEditPending}>
              {isAiEditPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Применить правки
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
       <ProjectUpdateDialog
          isOpen={isVersionDialogOpen}
          onClose={() => setIsVersionDialogOpen(false)}
          onProjectSelect={handleLoadVersion}
          currentProject={currentProject}
          dialogTitle="Просмотр версий"
          dialogDescription={`Загрузите любую из сохраненных версий для проекта "${getProjectDisplayName(currentProject)}".`}
        />
        {isRefineDialogOpen && (
            <RefineProjectDialog
                isOpen={isRefineDialogOpen}
                onClose={() => setIsRefineDialogOpen(false)}
                actionType={refineAction}
                project={currentProject}
                selectedModel={selectedModel}
                includeThoughts={includeThoughts}
                onProjectUpdate={handleAiProjectUpdate}
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
          <PrivatePriceDialog
            isOpen={isPriceBaseDialogOpen}
            onClose={() => setIsPriceBaseDialogOpen(false)}
            onConfirm={() => {}}
            projectId={currentProject.id}
            onBusinessFeatureClick={() => handleFeatureClick(false, 'Business')}
            onS3Request={handleS3Request}
          />
      )}
      {isGroupProcessingOpen && groupUploadFile && (
        <ProcessingDialog
          isOpen={isGroupProcessingOpen}
          onClose={handleGroupProcessingClose}
          file={groupUploadFile}
          model={selectedModel}
          includeThoughts={includeThoughts}
          objectId={currentProject.objectId ?? null}
          objectName={currentProject.objectName ?? null}
          onProjectProcessed={handleGroupProjectProcessed}
        />
      )}
      {isGroupZipDialogOpen && currentGroup && (
        <GroupZipDialog
          isOpen={isGroupZipDialogOpen}
          onClose={() => setIsGroupZipDialogOpen(false)}
          projects={currentGroup}
          companies={companies || []}
        />
      )}
      
      <div className={cn("flex flex-col lg:flex-row gap-6 items-start", isPwa && "gap-4")}>
        <div className={cn("w-full lg:w-96 lg:sticky lg:top-4 space-y-4 flex-shrink-0 order-1 lg:order-2", isPwa && "space-y-3")}>
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
            groupSmrTotal={groupSmrTotal}
            groupProjects={currentGroup}
            isGroupWorkActive={isGroupWorkActive}
          />
          <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">AI‑правки проекта</div>
            <Button
              size="sm"
              variant="outline"
              className={cn("h-8", proButtonClass)}
              onClick={() => isPro ? setIsAiEditDialogOpen(true) : handleFeatureClick(false, 'PRO')}
            >
              <Bot className="mr-2 h-4 w-4" />
              {withProLabel("Правки")}
            </Button>
          </div>
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
                  const nextHistory = actionHistory.slice(actionIndex + 1);
                  setActionHistoryForCurrent(nextHistory);
                  persistActionHistory(nextProject.id, nextHistory);
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
            <Card
              className={cn(
                "group border-dashed transition-colors",
                isGroupWorkActive
                  ? "bg-blue-50/30 border-blue-100/70 hover:border-blue-200/80 hover:bg-blue-50/40 active:bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 dark:hover:border-blue-800/60 dark:hover:bg-blue-950/30 dark:active:bg-blue-950/35"
                  : "bg-muted/40 hover:bg-muted/50 active:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/25 dark:active:bg-muted/30"
              )}
            >
              <CardHeader className="py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle
                        className={cn(
                          "text-base truncate transition-colors",
                          isGroupWorkActive
                            ? "text-slate-800/90 dark:text-slate-100/90"
                            : "text-foreground/90"
                        )}
                        title={getProjectDisplayName(currentProject)}
                      >
                        Группа: {currentProject.objectName || "Без названия"}
                      </CardTitle>
                      <CardDescription
                        className={cn(
                          "transition-colors",
                          isGroupWorkActive
                            ? "text-slate-600/80 dark:text-slate-300/70"
                            : "text-muted-foreground/80"
                        )}
                      >
                        Редактирование нескольких смет в рамках группы.
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-2">
                        <Switch
                          id="group-mode-toggle"
                          checked={isGroupWorkEnabled}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              setIsGroupWorkEnabled(false);
                              return;
                            }
                            if (isPro) {
                              setIsGroupWorkEnabled(true);
                              return;
                            }
                            handleFeatureClick(false, 'PRO');
                          }}
                        />
                        <Label
                          htmlFor="group-mode-toggle"
                          className={cn(
                            "text-xs transition-colors",
                            isGroupWorkEnabled
                              ? "text-blue-700/70 dark:text-blue-200/70"
                              : "text-muted-foreground/80"
                          )}
                        >
                          {isGroupWorkEnabled ? "Групповая работа включена" : "Работа по вкладке"}
                        </Label>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={groupFileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleGroupFileSelect}
                      />
                      {isGroupWorkActive && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className={groupActionButtonClass}
                            onClick={() => isPro ? setIsGroupZipDialogOpen(true) : handleFeatureClick(false, 'PRO')}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">{withProLabel("Выгрузка группы")}</span>
                            <span className="sm:hidden">{withProLabel("Выгр.")}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={groupActionButtonClass}
                            onClick={() => isPro ? handleOpenSyncDialog() : handleFeatureClick(false, 'PRO')}
                          >
                            <span className="hidden sm:inline">{withProLabel("Синхронизировать сейчас")}</span>
                            <span className="sm:hidden">{withProLabel("Синхр.")}</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Tabs value={resolvedActiveProjectId} onValueChange={handleProjectTabChange}>
                    <TabsList className="w-full flex-wrap gap-2">
                      {currentGroup?.map((project) => (
                        <TabsTrigger
                          key={project.id}
                          value={project.id}
                          className="max-w-[16rem] truncate transition-colors hover:bg-muted/50 active:bg-muted/70 dark:hover:bg-muted/30 dark:active:bg-muted/40 data-[state=active]:bg-background/70 data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-muted/20"
                        title={getProjectDisplayName(project)}
                        >
                        {getProjectDisplayName(project)}
                        </TabsTrigger>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 px-2", !isPro && "text-muted-foreground")}
                        onClick={() => isPro ? groupFileInputRef.current?.click() : handleFeatureClick(false, 'PRO')}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">{withProLabel("Добавить")}</span>
                        {!isPro && <PlanBadge plan="PRO" size="xs" className="ml-1 sm:hidden" />}
                      </Button>
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
                        <CardTitle className="truncate" title={getProjectDisplayName(currentProject)}>
                          {getProjectDisplayName(currentProject)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={() => setIsVersionDialogOpen(true)}>
                              {getProjectVersionLabel(currentProject)} {currentProject.isMainVersion && '(Основная)'}
                          </Button>
                        </div>
                    </div>
                     <Button variant="ghost" size="sm" onClick={onBackToProjects ? onBackToProjects : () => { setNavigating(true); router.push('/dashboard'); }}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>{isPwa ? "Назад" : "К проектам"}
                     </Button>
                </div>
            </CardHeader>
          </Card>

          <Accordion type="multiple" defaultValue={['calculator', 'specification']} className="w-full space-y-6">
            <AccordionItem value="ai-settings" className="border rounded-lg">
              <AiAssistantSettings 
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                includeThoughts={includeThoughts}
                onThoughtsChange={setIncludeThoughts}
                onProFeatureClick={() => handleFeatureClick(false, 'PRO')}
                onBusinessFeatureClick={() => handleFeatureClick(false, 'Business')}
              />
            </AccordionItem>

            <AccordionItem value="calculator" className="border rounded-lg">
               <Calculator 
                    initialProjectData={currentProject} 
                    calculatedDevices={devicesCount} 
                    calculatedCable={cableMeters} 
                    calculatedCableSupport={cableSupportMeters}
                    onProFeatureClick={() => handleFeatureClick(false, 'PRO')}
                    onApplyPricesFromPrivateBase={() => setIsPriceBaseDialogOpen(true)}
                onSmrCostChange={setSmrCost}
                externalUpdates={calculatorUpdates}
                onExternalUpdatesApplied={() => setCalculatorUpdates(null)}
                onComplexityChange={applyComplexityMultiplier}
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

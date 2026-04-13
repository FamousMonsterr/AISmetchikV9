// @ts-nocheck
// src/components/RefineProjectDialog.tsx
"use client";

import { useState, useRef, useEffect, useMemo, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Wand2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useAppContext, SpecificationItem, type HistoryRequest, UserPlan } from '@/contexts/AppContext';
import { nanoid } from 'nanoid';
import { incrementAiCallCount } from '@/actions/userActions';
import { refineItemsFlow, type RefineItemsInput, type RefineItemsOutput } from '@/ai/flows/refine-items-flow';
import { findMissingItemsFlow, type FindMissingItemsInput } from '@/ai/flows/find-missing-items-flow';
import { UpgradeAccountDialog } from './UpgradeAccountDialog';
import { getProjectDisplayName } from '@/lib/project-labels';
import aiConstructorConfig from '@/lib/ai-constructor-config.json';


const ANALYSIS_TIMEOUT_MS = 119000; // 119 seconds, just before the server timeout

interface RefineProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: string; // Now a string from config
  project: HistoryRequest | null;
  selectedModel: string;
  includeThoughts: boolean;
  onProjectUpdate?: (nextProject: HistoryRequest, actionDescription: string) => void;
}


export function RefineProjectDialog({ isOpen, onClose, actionType, project, selectedModel, includeThoughts, onProjectUpdate }: RefineProjectDialogProps) {
  const { user, setCurrentProject, setShowTimeoutWarning, effectivePlan } = useAppContext();
  const [isProcessing, startProcessing] = useTransition();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast, dismiss } = useToast();
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  const actionConfig = useMemo(() => {
    return aiConstructorConfig.actions.find(a => a.id === actionType);
  }, [actionType]);


  useEffect(() => {
    // Cleanup timeout on unmount or if dialog is closed
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cleanupTimeout = () => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
  };

  const handleProcess = async () => {
    if (!user || !project || !project.fileUri || !project.mimeType || !actionConfig) {
      toast({ title: "Ошибка", description: "Отсутствуют необходимые данные для доработки проекта.", variant: "destructive" });
      return;
    }

    const aiCallLimit = (effectivePlan === 'PRO' || effectivePlan === 'Business' || effectivePlan === 'Enterprise') ? 50 : 10;
    const currentAiCalls = project.aiCallCount || 0;

    if (currentAiCalls >= aiCallLimit) {
        if (effectivePlan === 'Free') {
            setIsUpgradeModalOpen(true);
        } else {
            toast({
                title: "Достигнут лимит вызовов AI",
                description: `Вы использовали ${currentAiCalls} из ${aiCallLimit} бесплатных доработок для этого проекта. Создайте новую версию, чтобы продолжить.`,
                variant: 'destructive',
                duration: 10000,
            });
        }
        return;
    }
    
    const callsLeft = aiCallLimit - currentAiCalls;
    const warningThreshold = Math.floor(aiCallLimit * 0.2); // 20%
    if (callsLeft <= warningThreshold && callsLeft > 0) {
        toast({
            title: "Предупреждение",
            description: `Осталось ${callsLeft} бесплатных доработок для этого проекта.`,
            variant: "default"
        });
    }

    startProcessing(async () => {
        let toastId: string | undefined;
        let countdownInterval: NodeJS.Timeout | undefined;

        cleanupTimeout();
        timeoutRef.current = setTimeout(() => {
            setShowTimeoutWarning(true);
        }, ANALYSIS_TIMEOUT_MS);

        try {
            const { id } = toast({
                title: "Доработка запущена...",
                description: "Подготовка данных для AI.",
                duration: ANALYSIS_TIMEOUT_MS + 5000,
            });
            toastId = id;

          const itemsToRefine = (actionType === 'fillEmpty')
            ? project.outputSpecifications.filter(item => !item.name || !item.model || !item.brand || !item.quantityToInstall || !item.unit)
            : project.outputSpecifications.filter(item => item.status === 'Уточнить');
            
          if ((actionType === 'refineItems' || actionType === 'fillEmpty') && itemsToRefine.length === 0) {
            const message = actionType === 'fillEmpty'
                ? "Все обязательные поля уже заполнены."
                : "Пожалуйста, отметьте хотя бы одну позицию статусом 'Уточнить'.";
            toast({ title: "Нет позиций для доработки", description: message, variant: "default" });
            // Exit without processing
            onClose(); 
            return;
          }
          
          let remaining = 120;
          toast({
              id: toastId,
              title: "Отправлено в AI",
              description: `Ожидание ответа от OpenRouter... Осталось ${remaining} сек.`,
          });
          countdownInterval = setInterval(() => {
              remaining--;
              if (remaining >= 0) {
                  toast({
                      id: toastId,
                      title: "Отправлено в AI",
                      description: `Ожидание ответа от OpenRouter... Осталось ${remaining} сек.`,
                  });
              } else {
                  clearInterval(countdownInterval);
              }
          }, 1000);
          
          let result;
          if (actionType === 'findMissing') {
              const flowInput: FindMissingItemsInput = {
                  fileUri: project.fileUri,
                  fileName: project.fileName,
                  mimeType: project.mimeType,
                  existingItems: project.outputSpecifications.map(i => ({ n: i.name, m: i.model, q: i.quantityToInstall })),
                  model: selectedModel,
              };
              result = await findMissingItemsFlow(flowInput);
          } else { // Handles refineItems and fillEmpty
              const flowInput: RefineItemsInput = {
                  fileUri: project.fileUri,
                  mimeType: project.mimeType,
                  itemsToRefine: itemsToRefine.map(item => ({
                      id: item.id,
                      n: item.name,
                      m: item.model,
                      b: item.brand,
                      q: item.quantityToInstall,
                      u: item.unit,
                      isInf: item.isInformational,
                      st: item.status,
                      c: item.comment,
                  })),
                  model: selectedModel,
                  refineMode: actionType === 'fillEmpty' ? 'fill-empty' : 'refine',
                  includeThoughts,
              };
              result = await refineItemsFlow(flowInput);
          }
          
          // Increment AI call count after successful call
          await incrementAiCallCount(project.id);
          
          cleanupTimeout();
          if(countdownInterval) clearInterval(countdownInterval);
          toast({ id: toastId, title: "Ответ получен", description: "Обработка результата..." });

          // Hydrate from short keys back to long keys
          const hydrateRefinedData = (aiItem: any): Partial<SpecificationItem> & { id?: string; splitFromId?: string } => ({
            id: aiItem.id,
            splitFromId: aiItem.splitFromId,
            name: aiItem.n,
            model: aiItem.m || null,
            brand: aiItem.b || null,
            quantityToInstall: aiItem.q,
            quantityReserve: aiItem.r || null,
            unit: aiItem.u,
            isInformational: aiItem.isInf || false,
            status: 'Утверждено', // Always set to approved after refinement
            comment: aiItem.c || ''
          });

          // Handle success
          if ((actionType === 'refineItems' || actionType === 'fillEmpty') && 'refinedSpecifications' in result) {
              let tempSpecs = [...project.outputSpecifications];
              const processedSplitIds = new Set<string>();

              result.refinedSpecifications.forEach((refinedItem: any) => {
                 const hydratedItem = hydrateRefinedData(refinedItem);
                 
                 if (hydratedItem.id) { // This is an update
                    const index = tempSpecs.findIndex(i => i.id === hydratedItem.id);
                    if (index !== -1) {
                       const originalItem = tempSpecs[index];
                       const newComment = (actionType === 'fillEmpty' && originalItem.comment && hydratedItem.comment)
                            ? `${originalItem.comment}. ${hydratedItem.comment}`
                            : (hydratedItem.comment || originalItem.comment);

                      tempSpecs[index] = { ...originalItem, ...hydratedItem, comment: newComment };
                    }
                  } else if (hydratedItem.splitFromId) { // This is from a split
                    if (!processedSplitIds.has(hydratedItem.splitFromId)) {
                      tempSpecs = tempSpecs.filter(i => i.id !== hydratedItem.splitFromId);
                      processedSplitIds.add(hydratedItem.splitFromId);
                    }
                    tempSpecs.push({ ...hydratedItem, id: nanoid() } as SpecificationItem);
                  }
              });
              const nextProject: HistoryRequest = {
                ...project,
                outputSpecifications: tempSpecs,
                aiComment: result.aiRefinementComment || project.aiComment,
                aiCallCount: (project.aiCallCount || 0) + 1,
              };
              if (onProjectUpdate) {
                onProjectUpdate(nextProject, actionType === 'fillEmpty' ? 'AI: заполнено пустое' : 'AI: уточнение позиций');
              } else {
                setCurrentProject(nextProject);
              }
              toast({ title: "Позиции уточнены!", description: result.aiRefinementComment || "Данные были успешно обновлены." });

          } else if (actionType === 'findMissing' && 'newlyFoundItems' in result) {
              if (result.newlyFoundItems.length > 0) {
                  const newItems = result.newlyFoundItems.map((item: any) => ({
                      ...hydrateRefinedData(item),
                      id: nanoid(),
                      status: 'На утверждение' as const,
                  }));
                  const nextProject: HistoryRequest = {
                    ...project,
                    outputSpecifications: [...project.outputSpecifications, ...newItems],
                    aiCallCount: (project.aiCallCount || 0) + 1,
                  };
                  if (onProjectUpdate) {
                    onProjectUpdate(nextProject, 'AI: поиск пропущенных позиций');
                  } else {
                    setCurrentProject(nextProject);
                  }
                  toast({ title: "Найдены новые позиции!", description: `Добавлено ${result.newlyFoundItems.length} новых позиций в конец списка.` });
              } else {
                  const nextProject: HistoryRequest = {
                    ...project,
                    aiCallCount: (project.aiCallCount || 0) + 1,
                  };
                  if (onProjectUpdate) {
                    onProjectUpdate(nextProject, 'AI: поиск пропущенных позиций');
                  } else {
                    setCurrentProject(nextProject);
                  }
                  toast({ title: "Ничего не найдено", description: "AI не нашел новых позиций в документе." });
              }
          }

          dismiss(toastId);
          onClose();

        } catch (error: any) {
          cleanupTimeout();
          if(countdownInterval) clearInterval(countdownInterval);
          dismiss(toastId);
          console.error(`Error during ${actionType}:`, error);
          toast({ title: `Ошибка ${actionConfig?.name || 'доработки'}`, description: error.message, variant: "destructive" });
        }
    });
  };
  
  if (!actionConfig) {
      return null; // Don't render if the action is not found in the config
  }
  
  const { name, description } = actionConfig;

  return (
    <>
    <UpgradeAccountDialog isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} targetRole="PRO" />
    <Dialog open={isOpen && !isUpgradeModalOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {isProcessing ? (
           <div className="flex flex-col items-center justify-center p-6 h-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p>Эта операция может занять до 2-х минут, не закрывайте окно.</p>
            </div>
        ) : (
        <>
            <div className="space-y-4 py-4">
                <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Внимание</AlertTitle>
                    <AlertDescription>
                      Процесс доработки использует тот же файл, что и при первоначальном анализе. Убедитесь, что это верный контекст для вашей задачи.
                      <p className="font-medium text-foreground mt-2 truncate" title={getProjectDisplayName(project)}>Проект: {getProjectDisplayName(project)}</p>
                    </AlertDescription>
                </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>Отмена</Button>
              <Button onClick={handleProcess} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isProcessing ? 'Обработка...' : 'Запустить'}
                  <span className='ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                      <Star className="h-3 w-3 mr-1" />
                      Free
                  </span>
              </Button>
            </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

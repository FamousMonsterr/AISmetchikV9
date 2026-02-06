// src/components/PrivatePriceDialog.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, DatabaseZap, AlertTriangle, Wand2, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type PriceBaseItem, type SpecificationItem } from '@/contexts/AppContext';
import { getStandardSections } from '@/actions/adminActions';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { updatePriceBase } from '@/actions/userActions';
import { PlanBadge } from '@/components/PlanBadge';

interface PrivatePriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSections: Set<string>) => void;
  projectId?: string;
  isGroupMode?: boolean;
  batchProjectCount?: number;
  onBusinessFeatureClick?: () => void;
}

export function PrivatePriceDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  projectId,
  isGroupMode = false,
  batchProjectCount = 0,
  onBusinessFeatureClick
}: PrivatePriceDialogProps) {
  const { user, currentProject, effectivePlan } = useAppContext();
  const { toast } = useToast();
  const isBusiness = effectivePlan === 'Business' || effectivePlan === 'Enterprise';
  const businessButtonClass = "border-blue-300 text-blue-700 hover:bg-blue-50";

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [allSections, setAllSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [newSection, setNewSection] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  const itemsToProcess = useMemo(() => {
    if (isGroupMode) return []; // In group mode, we don't need to validate items here
    return currentProject?.outputSpecifications.filter(item => item.status === 'Утверждено') || [];
  }, [currentProject, isGroupMode]);

  const validationError = useMemo(() => {
    if (isGroupMode) return null;
    const invalidItem = itemsToProcess.find(item => !item.name || (!item.materialPrice && !item.installationPrice));
    if (invalidItem) {
      return `Позиция "${invalidItem.name || 'Без названия'}" не имеет названия или цены. Заполните обязательные поля.`;
    }
    return null;
  }, [itemsToProcess, isGroupMode]);
  
  useEffect(() => {
    if (!isOpen) return;

    async function fetchSections() {
      setIsLoading(true);
      try {
        const projectHashtags = currentProject?.analysisDetails?.projectHashtags;
        const standardSectionsData = await getStandardSections();
        const existingSections = standardSectionsData.map(s => s.section);
        
        const suggestedSections = new Set<string>();

        if (projectHashtags && projectHashtags.length > 0) {
           projectHashtags.forEach(tag => {
             const matchingSection = standardSectionsData.find(s => s.hashtags.includes(tag));
             if(matchingSection) {
                suggestedSections.add(matchingSection.section);
             }
           });
        }
        
        setAllSections(Array.from(new Set([...suggestedSections, ...existingSections])));
        setSelectedSections(suggestedSections); // Auto-select suggested sections
        setIsCreatingNew(false);
        setNewSection('');

      } catch (error) {
        console.error(error);
        toast({ title: "Ошибка", description: "Не удалось загрузить разделы.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSections();
  }, [isOpen, currentProject, toast]);

  const handleConfirmClick = async () => {
    if (!user) return;
    
    if (isGroupMode) {
        onConfirm(selectedSections);
        onClose();
        return;
    }

    const finalSection = isCreatingNew ? newSection : (selectedSections.size > 0 ? Array.from(selectedSections)[0] : '');
    if (!finalSection) {
      toast({ title: "Ошибка", description: "Пожалуйста, выберите или создайте раздел.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    const result = await updatePriceBase(user.uid, itemsToProcess, finalSection);

    if (result.success) {
        toast({ title: "База цен обновлена", description: result.message });
    } else {
        toast({ title: "Ошибка обновления", description: result.message, variant: 'destructive' });
    }
    
    setIsProcessing(false);
    onClose();
  };

  const handleCreateNewToggle = (checked: boolean) => {
      // Logic for upgrading is handled by the parent component via onFeatureClick
      setIsCreatingNew(checked);
      if (checked) setSelectedSections(new Set());
  };

  const handleSectionToggle = (section: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      setIsCreatingNew(false);
      return newSet;
    });
  };
  
  const title = isGroupMode ? "Пакетное обновление цен" : "Добавить в базу цен";
  const description = isGroupMode 
    ? `Выберите разделы из вашей базы цен для обновления ${batchProjectCount} проектов.`
    : `Позиции со статусом "Утверждено" будут добавлены или обновлены в вашей приватной базе.`;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {validationError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ошибка валидации</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : !isGroupMode && itemsToProcess.length === 0 ? (
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Нет позиций для добавления</AlertTitle>
                <AlertDescription>
                    Отметьте хотя бы одну позицию статусом "Утверждено", чтобы добавить ее в базу.
                </AlertDescription>
            </Alert>
          ) : (
            <>
              {!isGroupMode && <Alert>
                  <Wand2 className="h-4 w-4" />
                  <AlertTitle>Будет обработано {itemsToProcess.length} позиций</AlertTitle>
                  <AlertDescription>
                    Система автоматически найдет и обновит существующие записи или создаст новые.
                  </AlertDescription>
              </Alert>}

              <div className="space-y-2">
                <Label className="font-semibold">{isGroupMode ? "Выберите разделы для поиска цен" : "Раздел для сохранения"}</Label>
                 {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin"/>
                 ) : (
                    <ScrollArea className="h-32 border rounded-md p-2">
                        {allSections.map(section => (
                            <div key={section} className="flex items-center space-x-3 py-1">
                                <Checkbox
                                    id={`section-${section}`}
                                    checked={selectedSections.has(section)}
                                    onCheckedChange={() => handleSectionToggle(section)}
                                />
                                <Label htmlFor={`section-${section}`} className="font-normal cursor-pointer">{section}</Label>
                            </div>
                        ))}
                         {allSections.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Разделов пока нет.</p>}
                    </ScrollArea>
                 )}
              </div>
              {!isGroupMode && (
                <div className="space-y-2">
                   <div className="flex items-center space-x-3">
                      <Checkbox id="create-new-section" checked={isCreatingNew} onCheckedChange={handleCreateNewToggle} />
                      <Label htmlFor="create-new-section" className="font-normal cursor-pointer flex items-center">
                          Создать новый раздел 
                      </Label>
                   </div>
                    {isCreatingNew && (
                      <Input 
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value)}
                          placeholder="Название нового раздела..."
                      />
                    )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="border rounded-md p-3 bg-blue-50/50 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Собственное S3-хранилище</p>
              <p className="text-xs text-muted-foreground">
                Подключите ваше хранилище для корпоративной безопасности и контроля доступа.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={businessButtonClass}
              onClick={() => onBusinessFeatureClick?.()}
            >
              <HardDrive className="mr-2 h-4 w-4" />
              Подключить S3
              {!isBusiness && (
                <PlanBadge plan="Business" size="xs" className="ml-2" />
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Отмена</Button>
          <Button onClick={handleConfirmClick} disabled={isLoading || isProcessing || !!validationError || (!isGroupMode && itemsToProcess.length === 0) || (isGroupMode && selectedSections.size === 0) || (!isGroupMode && selectedSections.size === 0 && !newSection)}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            Подтвердить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

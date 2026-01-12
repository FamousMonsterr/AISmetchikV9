// src/components/FindMissingDialog.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, PackageSearch, List, Bot, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type HistoryRequest, SpecificationItem } from '@/contexts/AppContext';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import aiConfig from '@/lib/ai-config.json';

interface FindMissingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: HistoryRequest;
  selectedModel: string;
  onApply: (foundItems: SpecificationItem[]) => void;
}

interface FoundItem extends Partial<SpecificationItem> {
    n: string;
    q: number;
    u: string;
}

export function FindMissingDialog({ isOpen, onClose, project, selectedModel, onApply }: FindMissingDialogProps) {
    const { user } = useAppContext();
    const { toast } = useToast();
    const [isProcessing, startProcessing] = useTransition();
    const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hasRun, setHasRun] = useState(false);
    
    useEffect(() => {
        if (!isOpen) {
            // Reset state when dialog is closed
            setFoundItems([]);
            setError(null);
            setHasRun(false);
        }
    }, [isOpen]);

    const handleRunSearch = () => {
        startProcessing(async () => {
            setError(null);
            setHasRun(true);
            try {
                if (!user || !project.fileUri || !project.mimeType) {
                    throw new Error("Необходимые данные для поиска отсутствуют (пользователь, URI файла или MIME-тип).");
                }
                const resolvedModel = aiConfig.apiModels.find(m => m.value === selectedModel)?.value
                  || aiConfig.apiModels.find(m => m.isDefault)?.value
                  || aiConfig.apiModels[0]?.value
                  || '';
                if (!resolvedModel) {
                    throw new Error("Не удалось определить модель AI для поиска пропущенных позиций.");
                }

                const response = await fetch('/api/find-missing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        fileUri: project.fileUri,
                        fileName: project.fileName,
                        mimeType: project.mimeType,
                        existingItems: project.outputSpecifications.map(i => ({ n: i.name, m: i.model, q: i.quantityToInstall })),
                        model: resolvedModel,
                        projectId: project.id,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Ошибка при поиске пропущенных позиций.");
                }
                
                setFoundItems(result.newlyFoundItems || []);
                if (result.newlyFoundItems?.length === 0) {
                     toast({ title: "Ничего не найдено", description: "AI не нашел в документе позиций, которых нет в текущей спецификации." });
                }

            } catch (e: any) {
                setError(e.message);
            }
        });
    };
    
    const handleConfirm = () => {
        onApply(foundItems as SpecificationItem[]);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><PackageSearch/> Поиск пропущенных позиций</DialogTitle>
                    <DialogDescription>AI проанализирует документ и сравнит его с текущей спецификацией, чтобы найти то, что могло быть упущено.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Alert>
                        <Bot className="h-4 w-4" />
                        <AlertTitle>Как это работает?</AlertTitle>
                        <AlertDescription>
                            Мы отправим AI список уже существующих позиций и попросим его найти в документе те, которых нет в этом списке.
                        </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64">
                         <div className="space-y-2">
                             <h3 className="font-semibold flex items-center gap-2"><List/> Отправлено в AI</h3>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    {project.outputSpecifications.filter(i => !i.isInformational).map(item => (
                                        <li key={item.id} className="truncate p-1 rounded hover:bg-muted/50">
                                            {item.name}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </div>
                        <div className="space-y-2">
                           <h3 className="font-semibold flex items-center gap-2"><CheckCircle className={foundItems.length > 0 ? "text-green-500" : ""}/> Найдено AI</h3>
                           <ScrollArea className="h-40 border rounded-md p-2">
                                {isProcessing ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin"/>
                                    </div>
                                ) : error ? (
                                    <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
                                        <AlertTriangle className="h-5 w-5 mr-2"/>
                                        {error}
                                    </div>
                                ) : foundItems.length > 0 ? (
                                    <ul className="text-xs text-foreground space-y-1">
                                        {foundItems.map((item, index) => (
                                            <li key={index} className="flex justify-between items-center p-1 rounded hover:bg-muted/50">
                                                <span className="truncate pr-2">{item.n}</span>
                                                <Badge variant="secondary">{item.q} {item.u}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                     <div className="flex items-center justify-center h-full text-muted-foreground text-center p-4">
                                         {hasRun ? "Ничего не найдено" : "Запустите поиск, чтобы увидеть результат"}
                                    </div>
                                )}
                           </ScrollArea>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>Отмена</Button>
                    {!hasRun ? (
                        <Button onClick={handleRunSearch} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackageSearch className="mr-2 h-4 w-4"/>}
                            Начать поиск
                        </Button>
                    ) : (
                         <Button onClick={handleConfirm} disabled={isProcessing || foundItems.length === 0}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                            Применить и добавить ({foundItems.length})
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// src/components/dashboard/HistorySection.tsx
// @ts-nocheck
"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { 
    FileText, AlertTriangle, Loader2, FileSignature, FileSpreadsheet, 
    MessageSquareWarning, Layers, Archive, ArchiveRestore, Eye, GitMerge, 
    Pencil, Trash2, Unlink, ChevronDown, Group, History, Download, Bot, SaveIcon, 
    Link as LinkIcon, FileUp, GitPullRequestCreate, Search, GitBranch, RefreshCcw
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppContext, type HistoryRequest } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ProjectUpdateDialog } from '@/components/ProjectUpdateDialog';
import { PrivatePriceDialog } from '@/components/PrivatePriceDialog';
import { UpgradeAccountDialog } from '@/components/UpgradeAccountDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { nanoid } from 'nanoid';
import { saveAs } from 'file-saver';
import { onSnapshot, collection, where, orderBy, FirebaseError, query, getDoc, doc, getDocs } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { deleteRequest, archiveRequest, unarchiveRequest, updateRequest, reportRequest, returnCreditForFailedRequest, saveProjectVersion, restartProcessingRequest } from '@/actions/userActions';
import { runBatchPriceUpdate } from '@/actions/batchActions';
import { generateObjectSummaryExcel } from '@/services/excelGenerator';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { ProjectGroup } from '@/components/dashboard/ProjectGroup';
import { LabelInputContainer } from '@/components/ui/aceternity-ui';
import aiConfig from '@/lib/ai-config.json';


export function HistorySection({ 
    isMobilePanel = false,
    onProjectSelect,
    searchTerm: initialSearchTerm = ""
}: { 
    isMobilePanel?: boolean,
    onProjectSelect?: (project: HistoryRequest) => void,
    searchTerm?: string
}) {
    const { user, setCurrentProject, setCurrentGroup } = useAppContext();
    const { toast } = useToast();
    const router = useRouter();

    const [history, setHistory] = useState<HistoryRequest[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

    const [isNavigating, startNavigation] = useTransition();
    const [isActionPending, startActionTransition] = useTransition();

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Business' | 'Enterprise'>('PRO');
    const [isBatchPriceDialogOpen, setIsBatchPriceDialogOpen] = useState(false);
    const [projectsToUpdate, setProjectsToUpdate] = useState<HistoryRequest[]>([]);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    
    const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
    const [projectForVersions, setProjectForVersions] = useState<HistoryRequest | null>(null);

    useEffect(() => {
        setSearchTerm(initialSearchTerm);
    }, [initialSearchTerm]);

    const historyQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(db, 'requests'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );
    }, [user]);

    const applyHistorySnapshot = useCallback((items: HistoryRequest[]) => {
        const grouped: Record<string, HistoryRequest[]> = {};
        items.forEach((item) => {
            const parent = item.parentProjectId || item.id;
            if (!grouped[parent]) grouped[parent] = [];
            grouped[parent].push(item);
        });

        const pickLatest = (arr: HistoryRequest[]) => {
            return arr.slice().sort((a, b) => {
                const getTs = (x: HistoryRequest) => {
                    const val = (x.updatedAt || x.timestamp) as any;
                    if (!val) return 0;
                    if (typeof val?.toDate === 'function') return val.toDate().getTime();
                    return new Date(val).getTime();
                };
                return getTs(b) - getTs(a);
            })[0];
        };

        const collapsed: HistoryRequest[] = [];
        Object.values(grouped).forEach((list) => {
            const main = list.find((i) => i.isMainVersion !== false);
            collapsed.push(main || pickLatest(list));
        });

        const sorted = collapsed.sort((a, b) => {
            const getTs = (x: HistoryRequest) => {
                const val = (x.timestamp || x.updatedAt) as any;
                if (!val) return 0;
                if (typeof val?.toDate === 'function') return val.toDate().getTime();
                return new Date(val).getTime();
            };
            return getTs(b) - getTs(a);
        });

        setHistory(sorted);
        return sorted;
    }, []);

    const refreshHistory = useCallback(async () => {
        if (!historyQuery) return;
        setIsRefreshing(true);
        try {
            const snapshot = await getDocs(historyQuery);
            const historyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRequest));
            const filtered = applyHistorySnapshot(historyList);
            if (filtered.length === 0) {
                toast({
                    title: "Данные появятся позже",
                    description: "История обновляется. Попробуйте нажать «Обновить» чуть позже.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Ошибка обновления",
                description: error.message || "Не удалось обновить историю.",
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [applyHistorySnapshot, historyQuery, toast]);

    useEffect(() => {
        if (!user) {
          setIsLoadingHistory(false);
          return;
        }
        setIsLoadingHistory(true);
        if (!historyQuery) {
            setIsLoadingHistory(false);
            return;
        }
        const unsubscribe = onSnapshot(historyQuery, (querySnapshot) => {
            const historyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRequest));
            applyHistorySnapshot(historyList);
            setIsLoadingHistory(false);
        }, (error: FirebaseError) => {
            console.error("History fetch error:", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                toast({
                    title: "Требуется подготовка базы данных",
                    description: "Для работы этого раздела создается специальный индекс. Это может занять несколько минут. Пожалуйста, обновите страницу позже.",
                    variant: "destructive",
                    duration: 20000,
                });
            } else {
                toast({ title: "Ошибка загрузки истории", description: "Не удалось получить данные.", variant: "destructive" });
            }
            setIsLoadingHistory(false);
        });
        return () => unsubscribe();
    }, [user, toast, historyQuery, applyHistorySnapshot]);

    useEffect(() => { setSelection(new Set()); }, [activeTab]);

    const handleAction = useCallback(async (ids: string | string[], action: (data: any) => Promise<{ success: boolean; message: string; }>, params: any, successMessage?: string) => {
        if (!user) return;
        startActionTransition(async () => {
            const result = await action({ ...params, requestIds: ids, userId: user.uid });
            if (result.success) {
                toast({ title: "Успех!", description: successMessage || result.message });
            } else {
                toast({ title: "Ошибка", description: result.message || "Не удалось выполнить действие.", variant: "destructive" });
            }
        });
    }, [user, toast, startActionTransition]);

    const handleRetry = useCallback(async (item: HistoryRequest) => {
        if (!user) return;
        startActionTransition(async () => {
            try {
                let accessUrl = item.fileUri;
                if (item.s3ObjectKey) {
                    const refresh = await fetch('/api/s3-refresh-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objectKey: item.s3ObjectKey }) });
                    if (refresh.ok) {
                        const { newAccessUrl } = await refresh.json();
                        accessUrl = newAccessUrl;
                    } else {
                        const err = await refresh.json().catch(() => ({}));
                        throw new Error(err.error || 'Не удалось обновить ссылку в S3.');
                    }
                }
                if (!accessUrl) throw new Error('Нет доступной ссылки на файл для повторного анализа.');
                if (!item.fileSha1) throw new Error('Отсутствует хеш файла, повтор невозможен.');

                const restartResult = await restartProcessingRequest({
                    userId: user.uid,
                    projectId: item.id,
                    fileUri: accessUrl,
                    s3ObjectKey: item.s3ObjectKey || undefined,
                });
                if (!restartResult.success) throw new Error(restartResult.message);

                const modelToUse = item.modelUsed || aiConfig.apiModels.find((m: any) => m.isDefault)?.value || aiConfig.apiModels[0]?.value;
                const response = await fetch('/api/server-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        projectId: item.id,
                        fileUri: accessUrl,
                        fileSha1: item.fileSha1,
                        fileName: item.fileName,
                        mimeType: item.mimeType || 'application/pdf',
                        objectKey: item.s3ObjectKey,
                        model: modelToUse,
                    }),
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Не удалось запустить повторный анализ.');
                }
                toast({ title: "Запущено", description: "Повторный анализ отправлен в очередь." });
            } catch (err: any) {
                toast({ title: "Ошибка", description: err.message || "Не удалось запустить повтор.", variant: "destructive" });
            }
        });
    }, [user, toast, startActionTransition]);

    const handleReportAction = useCallback(async (item: HistoryRequest) => {
        if (!user) return;
        startActionTransition(async () => {
           const result = await reportRequest({ requestId: item.id, fileSha1: item.fileSha1, userId: user.uid });
           if (result.success) {
               toast({ title: "Успех!", description: result.message });
           } else {
               toast({ title: "Ошибка", description: result.message || "Не удалось выполнить действие.", variant: "destructive" });
           }
        });
     }, [user, toast, startActionTransition]);
     
    const handleCreditReturnAction = useCallback(async (id: string, cost: number) => {
        if (!user) return;
        startActionTransition(async () => {
           const result = await returnCreditForFailedRequest({ userId: user.uid, creditAmount: cost });
           if (result.success) {
               toast({ title: "Успех!", description: result.message });
           } else {
               toast({ title: "Ошибка", description: result.message || "Не удалось вернуть кредит.", variant: "destructive" });
           }
        });
     }, [user, toast, startActionTransition]);

    const handleDeleteForever = async () => {
        if (selection.size === 0 || !user) return;
        startActionTransition(async () => {
            const result = await deleteRequest({ requestIds: Array.from(selection), userId: user.uid });
            if (result.success) {
                toast({ title: "Удалено", description: result.message });
                setSelection(new Set());
            } else {
                toast({ title: "Ошибка", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleFeatureClick = (isAllowed: boolean, requiredRole: 'PRO' | 'Business' | 'Enterprise') => {
        if (!isAllowed) {
            setUpgradeTargetRole(requiredRole);
            setIsUpgradeModalOpen(true);
        }
    };

    const handleViewResult = (item: HistoryRequest) => {
        if (isMobilePanel && onProjectSelect) {
            onProjectSelect(item);
            return;
        }

        startNavigation(() => {
            if (item.status === 'failed') {
                toast({ title: "Ошибка анализа", description: "Этот анализ завершился с ошибкой, результат недоступен.", variant: "destructive" });
                return;
            }
            setCurrentGroup(null);
            setCurrentProject(item);
            router.push('/dashboard/calculator');
        });
    };
    
    const handleLoadVersion = async (projectId: string) => {
        const projectRef = doc(db, 'requests', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
            handleViewResult({ id: projectSnap.id, ...projectSnap.data() } as HistoryRequest);
            setIsVersionDialogOpen(false);
        }
    }

    const handleEditGroup = (object: { name: string, projects: HistoryRequest[] }) => {
        startNavigation(() => {
            if (!object || object.projects.length === 0) return;
            const [firstProject] = object.projects;
            setCurrentGroup(object.projects);
            setCurrentProject(firstProject || null);
            router.push('/dashboard/calculator');
        });
    };

    const filteredHistory = useMemo(() => {
        return history.filter(project => {
            if (!searchTerm) return true;
            const lowerSearch = searchTerm.toLowerCase();
            return (
                project.fileName?.toLowerCase().includes(lowerSearch) ||
                project.objectName?.toLowerCase().includes(lowerSearch) ||
                project.status?.toLowerCase().includes(lowerSearch) ||
                project.analysisDetails?.systemType?.toLowerCase().includes(lowerSearch)
            );
        });
    }, [history, searchTerm]);

    const groupedHistory = useMemo(() => {
        const objects: Record<string, { name: string; projects: HistoryRequest[]; isArchived: boolean }> = {};
        const ungroupedActive: HistoryRequest[] = [];
        const ungroupedArchived: HistoryRequest[] = [];

        for (const project of filteredHistory) {
            if (project.objectId && project.objectName) {
                if (!objects[project.objectId]) {
                    objects[project.objectId] = { name: project.objectName, projects: [], isArchived: !!project.archivedAt };
                }
                objects[project.objectId].projects.push(project);
                if (project.archivedAt) objects[project.objectId].isArchived = true;
            } else {
                if (project.archivedAt) ungroupedArchived.push(project);
                else ungroupedActive.push(project);
            }
        }

        const activeObjects = Object.values(objects).filter(o => !o.isArchived);
        const archivedObjects = Object.values(objects).filter(o => o.isArchived);

        return { activeObjects, ungroupedActive, archivedObjects, ungroupedArchived };
    }, [filteredHistory]);

    const handleCreateGroup = () => {
        if (!user || selection.size === 0 || !newGroupName.trim()) {
            toast({ title: "Ошибка", description: "Название группы не может быть пустым или не выбраны проекты.", variant: "destructive" });
            return;
        };

        startActionTransition(async () => {
            const objectId = nanoid();
            const projectIds = Array.from(selection);
            await handleAction(projectIds, updateRequest, { updates: { objectId, objectName: newGroupName } }, `Проекты сгруппированы в "${newGroupName}".`);
            setSelection(new Set());
            setNewGroupName("");
            setIsGroupDialogOpen(false);
        });
    };

    const handleUngroup = (projectIdsToUngroup: string[]) => {
        if (!user || projectIdsToUngroup.length === 0) return;
        startActionTransition(async () => {
            await handleAction(projectIdsToUngroup, updateRequest, { updates: { objectId: null, objectName: null } }, 'Проект(ы) откреплены от группы.');
            setSelection(new Set());
        });
    }

    const handleDownloadObjectReport = async (object: { name: string, projects: HistoryRequest[] }) => {
        toast({ title: "Генерация отчета...", description: "Пожалуйста, подождите." });
        try {
            const blob = await generateObjectSummaryExcel(object.projects, {} as any);
            saveAs(blob, `Сводка_${object.name}.xlsx`);
        } catch (e) {
            toast({ title: "Ошибка", description: "Не удалось создать сводный отчет.", variant: "destructive" });
        }
    };

    const handleSelectionChange = (id: string, checked: boolean) => {
        setSelection(prev => {
            const newSelection = new Set(prev);
            if (checked) {
                newSelection.add(id);
            } else {
                newSelection.delete(id);
            }
            return newSelection;
        });
    };

    const canGroupProjects = user ? user.canGroupProjects : false;

    const handleBatchPriceUpdate = async (selectedSections: Set<string>) => {
        if (!user) return;
        const projectIds = projectsToUpdate.map(p => p.id);
        startActionTransition(async () => {
            const result = await runBatchPriceUpdate({
                userId: user.uid,
                projectIds: projectIds,
                selectedSections: Array.from(selectedSections),
            });
            if (result.success) {
                toast({ title: "Успех!", description: result.message });
            } else {
                toast({ title: "Ошибка", description: result.message, variant: "destructive" });
            }
        });
    };
    
    const handleRenameProject = async (id: string, newName: string) => {
        if (!user) return;
        await updateRequest({ requestIds: [id], userId: user.uid, updates: { fileName: newName }});
    }

    return (
        <>
            <UpgradeAccountDialog isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} targetRole={upgradeTargetRole} />
            {isBatchPriceDialogOpen && (<PrivatePriceDialog isOpen={isBatchPriceDialogOpen} onClose={() => setIsBatchPriceDialogOpen(false)} onConfirm={handleBatchPriceUpdate as any} isGroupMode={true} batchProjectCount={projectsToUpdate.length}/> )}
             {projectForVersions && (
                <ProjectUpdateDialog
                    isOpen={isVersionDialogOpen}
                    onClose={() => setIsVersionDialogOpen(false)}
                    onProjectSelect={handleLoadVersion}
                    currentProject={projectForVersions}
                    dialogTitle="Просмотр версий"
                    dialogDescription={`Загрузите любую из сохраненных версий для проекта "${projectForVersions.fileName}".`}
                />
            )}
            <AlertDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Создать новую группу</AlertDialogTitle>
                        <AlertDialogDescription>
                            Введите название для новой группы. Выбрано {selection.size} проект(а/ов).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <LabelInputContainer>
                          <Label htmlFor="group-name">Название группы</Label>
                          <Input id="group-name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Напр., ЖК 'Солнечный', 1-й корпус" />
                        </LabelInputContainer>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateGroup} disabled={isActionPending || !newGroupName.trim()}>
                            {isActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Создать группу
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Card className={isMobilePanel ? "border-none shadow-none bg-transparent" : ""}>
                 {!isMobilePanel && (
                    <CardHeader className="sticky top-16 z-20 bg-background/90 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle>История проектов</CardTitle>
                                <CardDescription>Ваши последние расчеты и версии проектов.</CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex rounded-md border border-border overflow-hidden">
                                    <Button
                                        variant={density === 'comfortable' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="rounded-none"
                                        onClick={() => setDensity('comfortable')}
                                    >
                                        Просторно
                                    </Button>
                                    <Button
                                        variant={density === 'compact' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="rounded-none border-l border-border"
                                        onClick={() => setDensity('compact')}
                                    >
                                        Компактно
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshHistory}
                                    disabled={isLoadingHistory || isRefreshing}
                                >
                                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Обновить
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                )}
                 <CardContent className={isMobilePanel ? "p-0" : ""}>
                    {!isMobilePanel && (
                        <div className="mb-4">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Поиск по названию, объекту..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    )}
                     {(activeTab === 'active' || activeTab === 'archived') && selection.size > 0 && !isMobilePanel && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {activeTab === 'active' && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleUngroup(Array.from(selection))} disabled={isActionPending}>
                                        <Unlink className="mr-2 h-4 w-4" />Открепить
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => canGroupProjects ? setIsGroupDialogOpen(true) : handleFeatureClick(false, 'Enterprise')} disabled={isActionPending}>
                                        <GitMerge className="mr-2 h-4 w-4" />Сгруппировать
                                        {!canGroupProjects && <Badge variant="outline" className="ml-2 text-xs h-5 px-1 text-amber-500 border-amber-400">PRO</Badge>}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleAction(Array.from(selection), archiveRequest, {}, "Проекты архивированы.")} disabled={isActionPending}>
                                        <Archive className="mr-2 h-4 w-4"/>Архивировать ({selection.size})
                                    </Button>
                                </>
                            )}
                            {activeTab === 'archived' && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleAction(Array.from(selection), unarchiveRequest, {}, "Проекты восстановлены.")} disabled={isActionPending}>
                                        <ArchiveRestore className="mr-2 h-4 w-4"/>Восстановить ({selection.size})
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive" disabled={isActionPending}>
                                                <Trash2 className="mr-2 h-4 w-4"/>Удалить навсегда ({selection.size})
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                <AlertDialogDescription>Это действие нельзя отменить. Выбранные проекты будут удалены навсегда.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive" onClick={handleDeleteForever}>Удалить</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    )}
                    <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
                        {!isMobilePanel && (
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="active">Активные</TabsTrigger>
                                <TabsTrigger value="archived">Архив</TabsTrigger>
                            </TabsList>
                        )}
                        <HistoryRenderer 
                            isLoading={isLoadingHistory} 
                            activeTab={activeTab} 
                            groupedHistory={groupedHistory} 
                            selection={selection}
                            density={density}
                            isActionPending={isNavigating || isActionPending}
                            onSelectionChange={handleSelectionChange}
                            onViewResult={handleViewResult}
                            onUngroup={handleUngroup}
                            onArchive={ (ids) => handleAction(ids, archiveRequest, {}, 'Проекты архивированы.') }
                            onUnarchive={ (ids) => handleAction(ids, unarchiveRequest, {}, 'Проекты восстановлены.') }
                            onReport={handleReportAction}
                            onDelete={ (id) => handleAction(id, deleteRequest, {}) }
                            onEditGroup={handleEditGroup}
                            onDownloadReport={handleDownloadObjectReport}
                            onBatchPriceUpdate={ (projects) => { setProjectsToUpdate(projects); setIsBatchPriceDialogOpen(true); } }
                            onCreditReturn={handleCreditReturnAction}
                            onRenameProject={handleRenameProject}
                            onViewVersions={(project) => { setProjectForVersions(project); setIsVersionDialogOpen(true); }}
                            onRetry={handleRetry}
                        />
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
}


// --- Sub-component for rendering history to keep main component clean ---
interface HistoryRendererProps {
    isLoading: boolean;
    activeTab: string;
    groupedHistory: any;
    selection: Set<string>;
    isActionPending: boolean;
    density: 'comfortable' | 'compact';
    onSelectionChange: (id: string, checked: boolean) => void;
    onViewResult: (item: HistoryRequest) => void;
    onUngroup: (ids: string[]) => void;
    onArchive: (ids: string[]) => void;
    onUnarchive: (ids: string[]) => void;
    onReport: (item: HistoryRequest) => void;
    onCreditReturn: (id: string, cost: number) => void;
    onDelete: (id: string) => void;
    onEditGroup: (group: any) => void;
    onDownloadReport: (group: any) => void;
    onBatchPriceUpdate: (projects: HistoryRequest[]) => void;
    onRenameProject: (id: string, newName: string) => void;
    onViewVersions: (project: HistoryRequest) => void;
    onRetry: (item: HistoryRequest) => void;
}

const HistoryRenderer = (props: HistoryRendererProps) => {
    const { isLoading, activeTab, groupedHistory } = props;

    const renderEmptyState = (title: string, description: string) => (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12 mt-4">
          <History className="h-12 w-12 mb-4" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm">{description}</p>
      </div>
    );
    
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, idx) => (
                    <Card key={idx} className="p-3">
                        <div className="flex gap-3 items-center">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }
    
    const renderContent = () => {
        const { activeObjects, ungroupedActive, archivedObjects, ungroupedArchived } = groupedHistory;
        
        let objectsToRender, ungroupedToRender, emptyTitle, emptyDescription;
        
        if (activeTab === 'active') {
            objectsToRender = activeObjects;
            ungroupedToRender = ungroupedActive;
            emptyTitle = "Нет активных проектов";
            emptyDescription = "Начните новый расчет, чтобы увидеть его здесь. Если данные не появились сразу, нажмите «Обновить».";
        } else { // archived
            objectsToRender = archivedObjects;
            ungroupedToRender = ungroupedArchived;
            emptyTitle = "Архив пуст";
            emptyDescription = "Здесь будут находиться архивированные проекты и группы. Если данные не появились сразу, нажмите «Обновить».";
        }

        if (objectsToRender.length === 0 && ungroupedToRender.length === 0) { 
            return renderEmptyState(emptyTitle, emptyDescription);
        }
        
        return (
            <div className="space-y-6">
                {objectsToRender.map((obj: any) => <ProjectGroup key={obj.name} object={obj} density={props.density} {...props} />)}
                {ungroupedToRender.length > 0 && (
                    <div>
                        <h4 className="text-md font-semibold text-muted-foreground mt-8 mb-2 flex items-center gap-2">Проекты без группы</h4>
                        <div className="space-y-2">
                            {ungroupedToRender.map((p: any) => <ProjectCard key={p.id} item={p} density={props.density} {...props} />)}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    return <div className="mt-4">{renderContent()}</div>;
};

// src/app/dashboard/price-base/page.tsx
// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Wand2, FileQuestion, FolderKanban, FileUp, Pencil } from "lucide-react";
import { useAppContext, type PriceBaseItem } from '@/contexts/AppContext';
import { updatePriceBaseItem, savePriceBaseItems } from '@/actions/userActions';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDropzone } from 'react-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onSnapshot, query, collection, where, orderBy, FirebaseError } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { exportPriceBaseToExcel, parseExcelRowsFromArrayBuffer } from '@/services/excel/browserExcel';


export default function PriceBasePage() {
    const { user } = useAppContext();
    const { toast } = useToast();
    
    // State
    const [baseItems, setBaseItems] = useState<PriceBaseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();
    
    const [markup, setMarkup] = useState(0);

    const [isImporting, setIsImporting] = useState(false);
    const [importData, setImportData] = useState<{headers: string[], data: any[]}>({headers: [], data: []});
    
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [editingCell, setEditingCell] = useState<{ rowId: string; column: keyof PriceBaseItem } | null>(null);
    const [editingValue, setEditingValue] = useState<string | number>('');

    const [isAssignSectionOpen, setIsAssignSectionOpen] = useState(false);
    const [sectionName, setSectionName] = useState('');
    const [sectionSelectionMode, setSectionSelectionMode] = useState('new'); // 'new' or 'existing'
    const [selectedExistingSection, setSelectedExistingSection] = useState('');

    // --- Data Fetching with Real-time updates ---
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(
            collection(db, "priceBaseItems"), 
            where("userId", "==", user.uid),
            orderBy("name", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as PriceBaseItem))
              .sort((a, b) => {
                const sectionA = (a.section || '').toString();
                const sectionB = (b.section || '').toString();
                const bySection = sectionA.localeCompare(sectionB, 'ru');
                if (bySection !== 0) return bySection;
                return (a.name || '').toString().localeCompare((b.name || '').toString(), 'ru');
              });
            setBaseItems(items);
            setIsLoading(false);
        }, (error: FirebaseError) => {
            console.error("Error fetching price base:", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                toast({
                    title: "Требуется подготовка базы данных",
                    description: "Для работы этого раздела создается специальный индекс. Это может занять несколько минут. Пожалуйста, обновите страницу позже.",
                    variant: "destructive",
                    duration: 10000,
                });
            } else {
                 toast({ title: "Ошибка", description: "Не удалось загрузить вашу базу цен.", variant: "destructive" });
            }
            setIsLoading(false);
        });
        
        return () => unsubscribe(); // Cleanup listener on unmount
    }, [user, toast]);

    const handleCellBlur = async () => {
        if (!editingCell || !user) return;
        
        const { rowId, column } = editingCell;
        const originalItem = baseItems.find(item => item.id === rowId);
        const processedValue = typeof originalItem?.[column] === 'number' ? Number(editingValue) : editingValue;

        if (originalItem && !Object.is(originalItem[column], processedValue)) {
             startSavingTransition(async () => {
                const result = await updatePriceBaseItem(user.uid, rowId, { [column]: processedValue });
                if (!result.success) {
                    toast({ title: "Ошибка", description: result.message, variant: "destructive" });
                } else {
                     toast({ title: "Сохранено", description: `Поле '${String(column)}' обновлено.` });
                }
            });
        }
        setEditingCell(null);
    };
    
    // --- UI Handlers & Actions ---
    const handleExport = async () => {
        try {
            const dataToExport = baseItems.map(item => ({
                "Наименование": item.name, "Модель/Артикул": item.model || '', "Бренд": item.brand || '', "Ед. изм.": item.unit,
                "Цена материала (средняя)": item.avgMaterialPrice, "Цена монтажа (средняя)": item.avgInstallationPrice, "Раздел": item.section || ''
            }));
            await exportPriceBaseToExcel(dataToExport, "AI Smetchik_PriceBase.xlsx");
            toast({ title: "Экспорт завершен", description: "Ваша база цен сохранена в Excel." });
        } catch (error: any) {
            toast({
                title: "Ошибка экспорта",
                description: error?.message || "Не удалось сформировать Excel-файл.",
                variant: "destructive",
            });
        }
    };
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const { headers, data: dataRows } = await parseExcelRowsFromArrayBuffer(arrayBuffer);
                setImportData({ headers: headers, data: dataRows });
                setIsImporting(true);
            } catch (error: any) {
                toast({ title: "Ошибка импорта", description: error.message || "Не удалось прочитать файл.", variant: "destructive"});
            }
        };
        reader.readAsArrayBuffer(file);
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }, multiple: false });

    const handleImportedData = (newItems: Omit<PriceBaseItem, 'id' | 'createdAt' | 'key' | 'userId'>[]) => {
        if (!user) return;
        startSavingTransition(async () => {
            const result = await savePriceBaseItems(user.uid, newItems);
            if (result.success) {
                const newIds = result.newIds || [];
                toast({ title: "Импорт завершен", description: `Добавлено ${newItems.length} новых позиций.` });
                setSelection(new Set(newIds)); // Auto-select new items
                if (newIds.length > 0) {
                    setIsAssignSectionOpen(true); // Auto-open section dialog
                }
            } else {
                 toast({ title: "Ошибка импорта", description: result.message, variant: "destructive" });
            }
            setIsImporting(false);
        });
    };

    const handleSelectionChange = (rowId: string) => {
        setSelection(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(rowId)) newSelection.delete(rowId);
            else newSelection.add(rowId);
            return newSelection;
        });
    };
    
    const handleAssignSection = () => {
        if (!user || selection.size === 0) return;

        const finalSectionName = sectionSelectionMode === 'new' ? sectionName : selectedExistingSection;
        if (!finalSectionName) {
            toast({ title: "Ошибка", description: "Необходимо выбрать или ввести название раздела.", variant: "destructive"});
            return;
        }

        startSavingTransition(async () => {
            const updates = Array.from(selection).map(id => 
                updatePriceBaseItem(user.uid, id, { section: finalSectionName })
            );
            
            await Promise.all(updates);

            toast({ title: "Раздел назначен", description: `Раздел "${finalSectionName}" назначен для ${selection.size} позиций.` });
            
            setSelection(new Set());
            setSectionName('');
            setSelectedExistingSection('');
            setSectionSelectionMode('new');
            setIsAssignSectionOpen(false);
        });
    };
    
    const groupedItems = useMemo(() => {
        return baseItems.reduce((acc, item) => {
            const section = item.section || 'Без раздела';
            if (!acc[section]) acc[section] = [];
            acc[section].push(item);
            return acc;
        }, {} as Record<string, PriceBaseItem[]>);
    }, [baseItems]);

     const existingSections = useMemo(() => {
        const sections = new Set(baseItems.map(item => item.section).filter(Boolean) as string[]);
        return Array.from(sections);
    }, [baseItems]);
    
    const renderEditableCell = (item: PriceBaseItem, column: keyof PriceBaseItem) => {
        const isEditing = editingCell?.rowId === item.id && editingCell?.column === column;
        const value = item[column] as (string | number);

        if (isEditing) {
            return (
                <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCellBlur();
                        if (e.key === 'Escape') setEditingCell(null);
                    }}
                    autoFocus
                    className="h-8"
                    disabled={isSaving}
                />
            );
        }
        return (
            <div onClick={() => { setEditingCell({ rowId: item.id, column }); setEditingValue(value || ''); }} className="min-h-[2rem] p-2 -m-2 rounded-md hover:bg-muted/50 cursor-pointer flex items-center gap-2">
                {value || <span className="text-muted-foreground/50">...</span>} <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>
            </div>
        );
    };

    return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Моя база цен</CardTitle>
                    <CardDescription>
                        Здесь собраны все уникальные позиции из ваших проектов. Используйте их для быстрого подбора цен и управления прайс-листами.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="actions">
                            <AccordionTrigger>Дополнительные действия</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg">
                                    <div className="flex-1 min-w-[200px] space-y-2">
                                        <Label htmlFor="markup" className="flex items-center">Надбавка / Скидка (%)</Label>
                                        <Input id="markup" type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} placeholder="Напр., 10 или -5" />
                                    </div>
                                    <Button variant="outline" disabled><Wand2 className="mr-2 h-4 w-4" />Оптимизировать (AI)</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader><CardTitle className="text-lg">Экспорт</CardTitle></CardHeader>
                                        <CardFooter><Button onClick={handleExport} disabled={baseItems.length === 0}><Download className="mr-2 h-4 w-4"/>Экспорт в Excel</Button></CardFooter>
                                    </Card>
                                    <Card {...getRootProps({className: `p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : ''}`})}>
                                        <input {...getInputProps()} />
                                        <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground"><FileUp className="h-8 w-8"/>
                                            <h3 className="font-semibold text-foreground">Импорт из Excel</h3><p className="text-sm">Перетащите .xlsx файл или нажмите</p>
                                        </div>
                                    </Card>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-lg font-semibold">Содержимое базы</h3>
                             <Button size="sm" variant="outline" onClick={() => setIsAssignSectionOpen(true)} disabled={selection.size === 0 || isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FolderKanban className="mr-2 h-4 w-4"/>}
                                Назначить раздел
                            </Button>
                        </div>
                        <div className="border rounded-md overflow-hidden">
                            {isLoading ? (
                                <div className="h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : baseItems.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground"><FileQuestion className="h-10 w-10"/><p className="font-semibold">База цен пуста</p><p className="text-sm">Добавьте проекты в базу на странице "История" или импортируйте Excel-файл.</p></div>
                            ) : (
                                <Accordion type="multiple" defaultValue={Object.keys(groupedItems)} className="w-full">
                                    {Object.entries(groupedItems).map(([section, items]) => (
                                        <AccordionItem value={section} key={section}>
                                            <AccordionTrigger className="px-4 py-2 bg-muted/50 hover:no-underline">
                                                <div className="font-semibold">{section} ({items.length})</div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-0 overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-10"><Checkbox onCheckedChange={(checked) => {
                                                                const sectionIds = new Set(items.map(i => i.id));
                                                                if (checked) {
                                                                    setSelection(prev => new Set([...prev, ...sectionIds]));
                                                                } else {
                                                                    setSelection(prev => {
                                                                        const newSet = new Set(prev);
                                                                        sectionIds.forEach(id => newSet.delete(id));
                                                                        return newSet;
                                                                    });
                                                                }
                                                            }} /></TableHead>
                                                            <TableHead className="min-w-[250px]">Наименование</TableHead>
                                                            <TableHead className="min-w-[200px]">Модель/Бренд</TableHead>
                                                            <TableHead className="text-right min-w-[120px]">Цена мат.</TableHead>
                                                            <TableHead className="text-right min-w-[120px]">Цена монт.</TableHead>
                                                            <TableHead>Ед. изм.</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {items.map((item) => (
                                                            <TableRow key={item.id} data-state={selection.has(item.id) ? 'selected' : ''} className="group">
                                                                <TableCell><Checkbox checked={selection.has(item.id)} onCheckedChange={() => handleSelectionChange(item.id)} /></TableCell>
                                                                <TableCell>{renderEditableCell(item, 'name')}</TableCell>
                                                                <TableCell className="text-muted-foreground">{renderEditableCell(item, 'brand')} / {renderEditableCell(item, 'model')}</TableCell>
                                                                <TableCell className="text-right">{renderEditableCell(item, 'avgMaterialPrice')}</TableCell>
                                                                <TableCell className="text-right">{renderEditableCell(item, 'avgInstallationPrice')}</TableCell>
                                                                <TableCell>{renderEditableCell(item, 'unit')}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isImporting && (
                <ExcelImportDialog
                    isOpen={isImporting}
                    onClose={() => setIsImporting(false)}
                    importData={importData}
                    onImport={handleImportedData}
                />
            )}
            <AlertDialog open={isAssignSectionOpen} onOpenChange={setIsAssignSectionOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Назначить раздел для {selection.size} позиций</AlertDialogTitle>
                        <AlertDialogDescription>Выберите существующий раздел или создайте новый.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                           <Checkbox id="mode-new" checked={sectionSelectionMode === 'new'} onCheckedChange={() => setSectionSelectionMode('new')} />
                           <Label htmlFor="mode-new">Создать новый раздел</Label>
                        </div>
                        {sectionSelectionMode === 'new' && (
                            <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Напр., Видеонаблюдение" />
                        )}

                        <div className="flex items-center space-x-2">
                            <Checkbox id="mode-existing" checked={sectionSelectionMode === 'existing'} onCheckedChange={() => setSectionSelectionMode('existing')} disabled={existingSections.length === 0} />
                            <Label htmlFor="mode-existing" className={existingSections.length === 0 ? 'text-muted-foreground' : ''}>Добавить в существующий раздел</Label>
                        </div>

                         {sectionSelectionMode === 'existing' && (
                             <Select onValueChange={setSelectedExistingSection} value={selectedExistingSection}>
                                 <SelectTrigger><SelectValue placeholder="Выберите раздел..." /></SelectTrigger>
                                 <SelectContent>
                                     {existingSections.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                         )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAssignSection} disabled={
                            isSaving ||
                            (sectionSelectionMode === 'new' && !sectionName) || 
                            (sectionSelectionMode === 'existing' && !selectedExistingSection)
                        }>
                             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Назначить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

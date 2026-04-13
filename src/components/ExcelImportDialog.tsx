// src/components/ExcelImportDialog.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import type { SpecificationItem } from '@/contexts/AppContext';

interface ExcelImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  importData: { headers: string[]; data: any[] };
  onImport: (items: Partial<SpecificationItem>[]) => void;
}

const systemFields = [
    { value: 'name', label: 'Наименование', keywords: ['наименование', 'название', 'товар', 'позиция', 'name'] },
    { value: 'model', label: 'Модель/Артикул', keywords: ['модель', 'артикул', 'код', 'model', 'article'] },
    { value: 'brand', label: 'Бренд', keywords: ['бренд', 'производитель', 'brand', 'manufacturer'] },
    { value: 'unit', label: 'Ед. изм.', keywords: ['ед', 'изм', 'unit'] },
    { value: 'quantityToInstall', label: 'Количество', keywords: ['кол-во', 'количество', 'qty', 'quantity'] },
    { value: 'materialPrice', label: 'Цена материала', keywords: ['цена', 'прайс', 'стоимость', 'material'] },
    { value: 'installationPrice', label: 'Цена монтажа', keywords: ['монтаж', 'работа', 'installation'] },
    { value: 'section', label: 'Раздел', keywords: ['раздел', 'группа', 'категория', 'section', 'group'] },
] as const;

type SystemField = typeof systemFields[number]['value'];

// Simple similarity function
function getBestMatch(header: string): SystemField | 'ignore' {
    const lowerHeader = header.toLowerCase();
    for (const field of systemFields) {
        for (const keyword of field.keywords) {
            if (lowerHeader.includes(keyword)) {
                return field.value;
            }
        }
    }
    return 'ignore';
}


export function ExcelImportDialog({ isOpen, onClose, importData: initialImportData, onImport }: ExcelImportDialogProps) {
    const { headers, data } = initialImportData;
    const [mapping, setMapping] = useState<Record<string, SystemField | 'ignore'>>({});

    useEffect(() => {
        const initialMapping: Record<string, SystemField | 'ignore'> = {};
        headers.forEach(header => {
            initialMapping[header] = getBestMatch(header);
        });
        setMapping(initialMapping);
    }, [headers]);

    const handleMappingChange = (header: string, value: SystemField | 'ignore') => {
        setMapping(prev => ({ ...prev, [header]: value }));
    };

    const handleConfirmImport = () => {
        const newItems: Partial<SpecificationItem>[] = data.map(rowObject => {
            const newItem: Partial<SpecificationItem> = {};
            Object.entries(mapping).forEach(([header, systemField]) => {
                if (systemField !== 'ignore') {
                    const value = rowObject[header];
                    if (['materialPrice', 'installationPrice', 'quantityToInstall'].includes(systemField)) {
                        (newItem as any)[systemField] = Number(String(value || '0').replace(/,/g, '.')) || 0;
                    } else {
                        (newItem as any)[systemField] = value || '';
                    }
                }
            });
            // Ensure required fields have defaults if they weren't mapped
            if (!newItem.name) newItem.name = "Без названия";
            if (!newItem.unit) newItem.unit = "шт";
            
            return newItem;
        }).filter(item => item.name && item.name !== "Без названия");
        onImport(newItems);
    };
    
    const previewData = data.slice(0, 5);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Импорт из Excel</DialogTitle>
                    <DialogDescription>Сопоставьте столбцы из вашего файла с полями системы и просмотрите результат перед импортом.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(header => (
                                    <TableHead key={header} className="min-w-[200px] align-top">
                                        <p className="font-bold text-foreground pb-2">{header}</p>
                                        <Select
                                            value={mapping[header] || 'ignore'}
                                            onValueChange={(value: SystemField | 'ignore') => handleMappingChange(header, value)}
                                        >
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ignore">Пропустить столбец</SelectItem>
                                                {systemFields.map(sf => (
                                                    <SelectItem key={sf.value} value={sf.value}>{sf.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((row, rowIndex) => (
                                <TableRow key={`row-${rowIndex}`}>
                                    {headers.map((header) => (
                                        <TableCell key={`cell-${rowIndex}-${header}`} className="truncate">
                                            {String(row[header] ?? '')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Отмена</Button>
                    <Button onClick={handleConfirmImport}>Импортировать {data.length} строк</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

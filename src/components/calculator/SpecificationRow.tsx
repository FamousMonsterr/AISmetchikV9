// src/components/specification/SpecificationRow.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Trash2, CheckCircle, Search, AlertTriangle, MoreVertical, ChevronsUpDown, DraftingCompass, Wrench, Cable, HelpCircle } from 'lucide-react';
import type { SpecificationItem, ItemStatus, ItemType, QuoteConfig } from '@/contexts/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { Details } from '@/components/Details';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { calculateItemSum } from '@/lib/calculation';
import { useIsMobile } from '@/hooks/use-mobile';


const getStatusIcon = (status?: ItemStatus) => {
    switch (status) {
        case 'Утверждено': return <CheckCircle className="text-success" />;
        case 'На утверждение': return <Search className="text-yellow-500" />;
        case 'Уточнить': return <AlertTriangle className="text-red-500" />;
        default: return <CheckCircle className="text-gray-400" />;
    }
};

interface SpecificationRowProps {
    item: SpecificationItem;
    index: number;
    quoteConfig: QuoteConfig;
    onUpdate: (id: string, updates: Partial<SpecificationItem>) => void;
    onRemove: (id: string) => void;
}

export const SpecificationRow = React.memo(({ item, index, quoteConfig, onUpdate, onRemove }: SpecificationRowProps) => {
    const itemSum = useMemo(() => calculateItemSum(item, quoteConfig), [item, quoteConfig]);
    const isMobile = useIsMobile();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const showMaterialColumns = quoteConfig.showMaterialColumns !== false;
    const isCollapsed = isMobile && !isExpanded;


    const handleItemTypeChange = (type: ItemType) => {
        onUpdate(item.id, { itemType: type });
    };


    if (item.isInformational) {
        return (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md my-2">
                <Input
                    value={item.name}
                    onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                    className="text-base font-semibold border-none focus-visible:ring-0 shadow-none p-0 h-auto bg-transparent"
                    placeholder="Название раздела"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(item.id)}><Trash2 className="h-4 w-4"/></Button>
            </div>
        );
    }
    
    return (
        <Card className="flex flex-col">
            <CardContent className={cn("space-y-3", isMobile ? "p-2" : "p-3")}>
                {/* Header with Title and Actions */}
                <div className={cn("flex items-start gap-2", isMobile && "gap-1.5")}>
                     <div className="pt-1 flex-shrink-0 flex items-center gap-2">
                         <span className="text-xs font-bold text-muted-foreground w-5 text-center block">{index + 1}</span>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto p-0 flex items-center gap-1 text-xs">
                                     <div className="w-5" title={item.status}>{getStatusIcon(item.status)}</div>
                                     <ChevronsUpDown className="h-3 w-3 text-muted-foreground"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(['На утверждение', 'Утверждено', 'Уточнить'] as ItemStatus[]).map(status => (
                                    <DropdownMenuItem key={status} onSelect={() => onUpdate(item.id, { status: status })}>
                                        <span className="mr-2">{getStatusIcon(status)}</span>
                                        {status}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <Textarea
                        value={item.name}
                        onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                        className={cn(
                            "flex-grow min-w-0 font-medium resize-none",
                            isMobile ? "text-sm" : "text-base",
                            isCollapsed ? "h-8 overflow-hidden whitespace-nowrap text-ellipsis" : "min-h-[64px]"
                        )}
                        rows={isMobile ? (isExpanded ? 3 : 1) : 1}
                        onFocus={() => isMobile && setIsExpanded(true)}
                        onBlur={() => isMobile && setIsExpanded(false)}
                        onClick={() => isMobile && setIsExpanded(true)}
                        placeholder="Наименование"
                    />
                     <div className="flex-shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                     <MoreVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => onRemove(item.id)}>
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                    Удалить
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Main inputs */}
                <div className={cn("flex flex-col sm:flex-row gap-4", isMobile ? "pl-6" : "pl-8")}>
                    {/* Quantity Module */}
                    <fieldset className="p-2 border rounded-md space-y-2 flex-1">
                        <legend className="px-1 text-xs font-medium text-muted-foreground -ml-1">Количество</legend>
                        <div className="flex gap-2">
                            <div className="flex-auto">
                                <Label className="text-xs text-muted-foreground">Кол-во</Label>
                                <Input 
                                    value={item.quantityToInstall || ''} 
                                    type="number"
                                    onChange={(e) => onUpdate(item.id, { quantityToInstall: Number(e.target.value) })} 
                                />
                            </div>
                            {showMaterialColumns && (
                                <div className="w-20">
                                    <Label className="text-xs text-muted-foreground">ЗИП</Label>
                                    <Input 
                                        value={item.quantityReserve || ''}
                                        type="number"
                                        onChange={(e) => onUpdate(item.id, { quantityReserve: Number(e.target.value) })}
                                    />
                                </div>
                            )}
                            <div className="w-16">
                                <Label className="text-xs text-muted-foreground">Ед.изм.</Label>
                                <Input 
                                    value={item.unit || ''}
                                    onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Price Module */}
                     <fieldset className="p-2 border rounded-md space-y-2 flex-1">
                        <legend className="px-1 text-xs font-medium text-muted-foreground -ml-1">Стоимость</legend>
                        <div className="flex gap-2">
                            {showMaterialColumns && (
                                <div className="flex-auto">
                                    <Label className="text-xs text-muted-foreground">Цена МТР</Label>
                                    <Input 
                                        type="number" 
                                        value={item.materialPrice || ''} 
                                        onChange={(e) => onUpdate(item.id, { materialPrice: Number(e.target.value) })}
                                    />
                                </div>
                            )}
                             <div className="flex-auto">
                                <Label className="text-xs text-muted-foreground">Цена СМР</Label>
                                <Input 
                                    type="number" 
                                    value={item.installationPrice || ''} 
                                    onChange={(e) => onUpdate(item.id, { installationPrice: Number(e.target.value) })}
                                />
                             </div>
                        </div>
                    </fieldset>
                </div>

                {/* Collapsible Details */}
                <div className={cn("pt-1", isMobile ? "pl-6" : "pl-8")}>
                    <Details title="Детали">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Модель/Артикул</Label>
                                <Input value={item.model || ''} onChange={(e) => onUpdate(item.id, { model: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Бренд</Label>
                                <Input value={item.brand || ''} onChange={(e) => onUpdate(item.id, { brand: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-4 space-y-1">
                                <Label>Комментарий</Label>
                                <Textarea value={item.comment || ''} onChange={(e) => onUpdate(item.id, { comment: e.target.value })} rows={2}/>
                        </div>
                         <div className="mt-4 grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label>Статус</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start font-normal">
                                            <span className="mr-2">{getStatusIcon(item.status)}</span>
                                            {item.status}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {(['На утверждение', 'Утверждено', 'Уточнить'] as ItemStatus[]).map(status => (
                                            <DropdownMenuItem key={status} onSelect={() => onUpdate(item.id, { status: status })}>
                                                <span className="mr-2">{getStatusIcon(status)}</span>
                                                {status}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                             <div className="space-y-1">
                                 <Label>Учет в калькуляторе</Label>
                                 <div className="space-y-2 pt-2">
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id={`isDevice-${item.id}`} checked={item.itemType === 'device'} onCheckedChange={() => handleItemTypeChange('device')} />
                                         <Label htmlFor={`isDevice-${item.id}`} className="font-normal flex items-center gap-1.5"><DraftingCompass className="h-4 w-4 text-muted-foreground"/>Прибор</Label>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id={`isCable-${item.id}`} checked={item.itemType === 'cable'} onCheckedChange={() => handleItemTypeChange('cable')} />
                                         <Label htmlFor={`isCable-${item.id}`} className="font-normal flex items-center gap-1.5"><Cable className="h-4 w-4 text-muted-foreground"/>Кабель</Label>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id={`isCableSupport-${item.id}`} checked={item.itemType === 'cable_support'} onCheckedChange={() => handleItemTypeChange('cable_support')} />
                                         <Label htmlFor={`isCableSupport-${item.id}`} className="font-normal flex items-center gap-1.5"><Cable className="h-4 w-4 text-muted-foreground"/>Кабеленесущая конструкция</Label>
                                     </div>
                                      <div className="flex items-center space-x-2">
                                         <Checkbox id={`isConsumable-${item.id}`} checked={item.itemType === 'consumable'} onCheckedChange={() => handleItemTypeChange('consumable')} />
                                         <Label htmlFor={`isConsumable-${item.id}`} className="font-normal flex items-center gap-1.5"><Wrench className="h-4 w-4 text-muted-foreground"/>Расходник</Label>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id={`isOther-${item.id}`} checked={item.itemType === 'other'} onCheckedChange={() => handleItemTypeChange('other')} />
                                         <Label htmlFor={`isOther-${item.id}`} className="font-normal flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-muted-foreground"/>Другое</Label>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </Details>
                </div>
                 {/* Footer with Total */}
                <div className={cn("pt-2 flex justify-end items-center", isMobile ? "pl-6" : "pl-8")}>
                   <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Итого:</span>
                       <span className="font-bold text-lg">{itemSum.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

SpecificationRow.displayName = 'SpecificationRow';

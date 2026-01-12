// src/components/specification/QuoteSettings.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuoteConfig, TaxType } from "@/contexts/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";

interface QuoteSettingsProps {
    projectId: string;
    quoteConfig: QuoteConfig;
    specItemsTotalSum: number;
    onConfigChange: (updates: Partial<QuoteConfig>) => void;
}

const ServiceItem = ({ id, label, isIncluded, cost, quantity, onCheckedChange, onCostChange, onQuantityChange, isCostPercentage = false, totalSum = 0 }: any) => (
    <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center space-x-2">
            <Checkbox id={id} checked={isIncluded} onCheckedChange={onCheckedChange} />
            <Label htmlFor={id} className="font-medium">{label}</Label>
        </div>
        {isIncluded && (
            <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-1">
                    <Label htmlFor={`${id}-cost`} className="text-xs text-muted-foreground">{isCostPercentage ? "Процент от суммы СМР" : "Стоимость, ₽"}</Label>
                    <Input id={`${id}-cost`} type="number" value={cost} onChange={(e) => onCostChange(e.target.value)} />
                    {isCostPercentage && <p className="text-xs text-muted-foreground">Итого: {(totalSum * (cost/100)).toLocaleString('ru-RU')} ₽</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor={`${id}-qty`} className="text-xs text-muted-foreground">Кол-во</Label>
                    <Input id={`${id}-qty`} type="number" value={quantity} onChange={(e) => onQuantityChange(e.target.value)} disabled={isCostPercentage} />
                </div>
            </div>
        )}
    </div>
);


export function QuoteSettings({ quoteConfig, onConfigChange, specItemsTotalSum }: QuoteSettingsProps) {
    return (
        <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Система налогообложения</Label>
                    <Select value={quoteConfig.taxType} onValueChange={(v: TaxType) => onConfigChange({ taxType: v })}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Без налога</SelectItem>
                            <SelectItem value="vat_included">НДС в т.ч. (20%)</SelectItem>
                            <SelectItem value="vat_added">НДС сверху (20%)</SelectItem>
                            <SelectItem value="usn">УСН / НПД (6%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 pt-6">
                    <div className="flex items-center space-x-2">
                         <Checkbox
                            id="show-material-cols"
                            checked={quoteConfig.showMaterialColumns !== false}
                            onCheckedChange={(checked) => onConfigChange({ showMaterialColumns: !!checked })}
                        />
                        <Label htmlFor="show-material-cols">Показывать столбцы с материалами</Label>
                    </div>
                </div>
             </div>

            <h4 className="font-semibold pt-4">Дополнительные работы и услуги</h4>
            <div className="space-y-3">
                 <ServiceItem
                    id="commissioning"
                    label="Пуско-наладочные работы (ПНР)"
                    isIncluded={quoteConfig.includeCommissioning}
                    cost={quoteConfig.commissioningCost}
                    quantity={quoteConfig.commissioningQuantity}
                    onCheckedChange={(c:boolean) => onConfigChange({ includeCommissioning: c })}
                    onCostChange={(v:string) => onConfigChange({ commissioningCost: Number(v) })}
                    onQuantityChange={(v:string) => onConfigChange({ commissioningQuantity: Number(v) })}
                    isCostPercentage={true}
                    totalSum={specItemsTotalSum}
                />

                <ServiceItem
                    id="exec-docs"
                    label="Исполнительная документация (ИД)"
                    isIncluded={quoteConfig.includeExecutiveDocumentation}
                    cost={quoteConfig.executiveDocumentationTotalCost}
                    quantity={quoteConfig.executiveDocumentationQuantity}
                    onCheckedChange={(c:boolean) => onConfigChange({ includeExecutiveDocumentation: c })}
                    onCostChange={(v:string) => onConfigChange({ executiveDocumentationTotalCost: Number(v) })}
                    onQuantityChange={(v:string) => onConfigChange({ executiveDocumentationQuantity: Number(v) })}
                />
                 <ServiceItem
                    id="measurement"
                    label="Выезд на замер"
                    isIncluded={quoteConfig.includeMeasurementTrip}
                    cost={quoteConfig.measurementTripCost}
                    quantity={quoteConfig.measurementTripQuantity}
                    onCheckedChange={(c:boolean) => onConfigChange({ includeMeasurementTrip: c })}
                    onCostChange={(v:string) => onConfigChange({ measurementTripCost: Number(v) })}
                    onQuantityChange={(v:string) => onConfigChange({ measurementTripQuantity: Number(v) })}
                />
                 <ServiceItem
                    id="dismantling"
                    label="Демонтаж"
                    isIncluded={quoteConfig.includeDismantling}
                    cost={quoteConfig.dismantlingCost}
                    quantity={1} // Assuming dismantling is a single lump sum
                    onCheckedChange={(c:boolean) => onConfigChange({ includeDismantling: c })}
                    onCostChange={(v:string) => onConfigChange({ dismantlingCost: Number(v) })}
                    onQuantityChange={() => {}}
                />
                 <ServiceItem
                    id="wall-drilling"
                    label="Сверление стен"
                    isIncluded={quoteConfig.includeWallDrilling}
                    cost={quoteConfig.wallDrillingCost}
                    quantity={quoteConfig.wallDrillingCount}
                    onCheckedChange={(c:boolean) => onConfigChange({ includeWallDrilling: c })}
                    onCostChange={(v:string) => onConfigChange({ wallDrillingCost: Number(v) })}
                    onQuantityChange={(v:string) => onConfigChange({ wallDrillingCount: Number(v) })}
                />
                 <ServiceItem
                    id="floor-drilling"
                    label="Сверление перекрытий"
                    isIncluded={quoteConfig.includeFloorDrilling}
                    cost={quoteConfig.floorDrillingCost}
                    quantity={quoteConfig.floorDrillingCount}
                    onCheckedChange={(c:boolean) => onConfigChange({ includeFloorDrilling: c })}
                    onCostChange={(v:string) => onConfigChange({ floorDrillingCost: Number(v) })}
                    onQuantityChange={(v:string) => onConfigChange({ floorDrillingCount: Number(v) })}
                />
            </div>
        </div>
    );
}

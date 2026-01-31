// src/components/specification/TotalsAndActions.tsx
"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileSignature, GitBranch, GitPullRequestCreate, Save, DatabaseZap, Star, Share2, Loader2, Download, Send, FileText, FileSpreadsheet, Wand2, Bot } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { QuoteConfig, SpecificationItem, HistoryRequest, Company } from '@/contexts/AppContext';
import { calculateProjectTotals } from '@/lib/calculation';
import { DocumentGenerationDialog } from '@/components/DocumentGenerationDialog';
import aiConstructorConfig from '@/lib/ai-constructor-config.json';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '@/lib/utils';


interface TotalsAndActionsProps {
  specifications: SpecificationItem[];
  quoteConfig: QuoteConfig;
  activeProject: HistoryRequest | null;
  companies: Company[] | null;
  onSaveDraft: (isNewVersion: boolean, makeMain: boolean) => void;
  isSaving: boolean;
  isMainVersion: boolean;
  onAddToPriceBase: () => void;
  onRefineProject: (action: 'refine' | 'find-missing' | 'fill-empty') => void;
  onAIPricing: () => void;
  isActionLoading: boolean;
  canUsePrivatePriceBase: boolean;
  onFeatureClick: (isAllowed: boolean, requiredRole: 'PRO' | 'Business' | 'Enterprise') => void;
  groupSmrTotal?: number | null;
  groupProjects?: HistoryRequest[] | null;
  isGroupWorkActive?: boolean;
}

export function TotalsAndActions({ 
  specifications, 
  quoteConfig, 
  activeProject,
  companies,
  onSaveDraft,
  isSaving,
  isMainVersion,
  onAddToPriceBase,
  onRefineProject,
  onAIPricing,
  isActionLoading,
  canUsePrivatePriceBase,
  onFeatureClick,
  groupSmrTotal,
  groupProjects,
  isGroupWorkActive = false
}: TotalsAndActionsProps) {

  const [isDocGenDialogOpen, setIsDocGenDialogOpen] = useState(false);
  
  const constructorActions = useMemo(() => {
    return aiConstructorConfig.actions.filter(action => action.page === '/dashboard/calculator');
  }, []);

  const { subtotalBeforeTax, taxAmount, taxLabel, finalTotal } = useMemo(
    () => calculateProjectTotals(specifications, quoteConfig),
    [specifications, quoteConfig]
  );
  
  return (
    <>
      <DocumentGenerationDialog
        isOpen={isDocGenDialogOpen}
        onClose={() => setIsDocGenDialogOpen(false)}
        project={activeProject}
        specifications={specifications}
        quoteConfig={quoteConfig}
        companies={companies || []}
        projects={isGroupWorkActive ? (groupProjects || []) : []}
        isGroupWorkActive={isGroupWorkActive}
      />
      <Card>
        <CardHeader>
          <CardTitle>Итоги и действия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {quoteConfig.showMaterialColumns && (
            <div className="flex justify-between"><span className="text-muted-foreground">Итого по спецификации:</span> <span className="font-medium">{calculateProjectTotals(specifications, quoteConfig).specItemsTotalSum.toFixed(2)} ₽</span></div>
          )}
          {typeof groupSmrTotal === 'number' && (
            <div className="flex justify-between"><span className="text-muted-foreground">СМР группы:</span> <span className="font-medium">{groupSmrTotal.toFixed(2)} ₽</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Доп. работы и услуги:</span> <span className="font-medium">{calculateProjectTotals(specifications, quoteConfig).servicesSubtotal.toFixed(2)} ₽</span></div>
          <Separator />
          <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Подытог:</span> <span>{subtotalBeforeTax.toFixed(2)} ₽</span></div>
          {taxLabel && (
            <div className="flex justify-between">
              <span className="text-sm">{taxLabel}</span>
              <span className="text-sm font-bold">{taxAmount.toFixed(2)} ₽</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold"><span >ИТОГО:</span> <span>{finalTotal.toFixed(2)} ₽</span></div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-center gap-2">
                 <Button
                    onClick={onAIPricing}
                    disabled={!activeProject || isActionLoading}
                    className={cn(
                      "flex-1 transition-colors",
                      isGroupWorkActive && "bg-primary/90 hover:bg-primary/80 shadow-sm"
                    )}
                  >
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Распределить СМР (AI)
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" disabled={isActionLoading}>
                        <Wand2 className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {constructorActions.map((action) => (
                            <DropdownMenuItem key={action.id} onSelect={() => onRefineProject(action.id as any)}>
                                {action.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          <div className="pt-2 w-full">
            <div className="flex w-full items-center justify-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-12 w-12 border-green-500 text-green-600 hover:bg-green-100 hover:text-green-700" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => onSaveDraft(false, false)} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />Сохранить изменения
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSaveDraft(true, false)} disabled={isSaving}>
                    <GitPullRequestCreate className="mr-2 h-4 w-4" />Сохранить как новую версию
                  </DropdownMenuItem>
                  {!isMainVersion && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onSaveDraft(false, true)} disabled={isSaving} className="bg-green-100 dark:bg-green-900">
                        <GitBranch className="mr-2 h-4 w-4" />Сделать основной версией
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsDocGenDialogOpen(true)}
                className="flex-1 h-12 text-base"
                disabled={isActionLoading || isSaving}
              >
                <FileSignature className="mr-2 h-5 w-5" /> Документы
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-12 w-12 relative",
                        canUsePrivatePriceBase
                          ? "border-amber-500 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                          : "border-amber-300 text-amber-500 hover:bg-amber-50"
                      )}
                      onClick={() => canUsePrivatePriceBase ? onAddToPriceBase() : onFeatureClick(false, 'PRO')}
                      disabled={isActionLoading}
                    >
                      <DatabaseZap className="h-6 w-6" />
                      {!canUsePrivatePriceBase && <Star className="absolute -top-1 -right-1 h-4 w-4 text-amber-400" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{canUsePrivatePriceBase ? "Обновить мою базу цен" : "Обновить мою базу цен (PRO)"}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}

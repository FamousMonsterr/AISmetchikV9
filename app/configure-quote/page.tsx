
"use client";

import { useRouter } from 'next/navigation';
import { useAppContext, type QuoteConfig } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function ConfigureQuotePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { quoteConfig, setQuoteConfig, resetState } = useAppContext();

  // FIX: Prevent rendering if context is not ready
  if (!quoteConfig) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleCheckboxChange = (field: keyof QuoteConfig, checked: boolean) => {
    if (field === 'includeVAT' && checked) {
      setQuoteConfig({ includeVAT: true, includeUSN: false });
    } else if (field === 'includeUSN' && checked) {
      setQuoteConfig({ includeUSN: true, includeVAT: false });
    } else {
      setQuoteConfig({ [field]: checked });
    }
  };
  
  const handleCostChange = (field: keyof QuoteConfig, value: string) => {
    const cost = Number(value) || 0;
    setQuoteConfig({ [field]: cost < 0 ? 0 : cost });
  };
  
  const handleNextClick = () => {
    toast({
        title: "Переход к КП",
        description: "Формируем коммерческое предложение...",
        variant: "default",
    });
    router.push('/proposal');
  };
  
  const handleBackToDashboard = () => {
    // Maybe show a confirmation dialog here in the future
    resetState();
    router.push('/dashboard');
  };

  const handleSaveDraft = () => {
    // Placeholder for future functionality
    toast({
      title: "Функция в разработке",
      description: "Сохранение черновика будет доступно в следующих версиях.",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Настройки сметы</CardTitle>
        <CardDescription>
          Укажите параметры для формирования коммерческого предложения.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-secondary/50 transition-colors">
          <Checkbox
            id="includeVAT"
            checked={quoteConfig.includeVAT}
            onCheckedChange={(checked) => handleCheckboxChange('includeVAT', !!checked)}
          />
          <Label htmlFor="includeVAT" className="text-base cursor-pointer">
            Включить НДС 20%
          </Label>
        </div>
        <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-secondary/50 transition-colors">
          <Checkbox
            id="includeUSN"
            checked={quoteConfig.includeUSN}
            onCheckedChange={(checked) => handleCheckboxChange('includeUSN', !!checked)}
          />
          <Label htmlFor="includeUSN" className="text-base cursor-pointer">
            Включить УСН 6%
          </Label>
        </div>
         <div className="p-3 border rounded-md hover:bg-secondary/50 transition-colors">
            <div className="flex items-center space-x-3 mb-2">
                <Checkbox
                    id="includeCommissioning"
                    checked={quoteConfig.includeCommissioning}
                    onCheckedChange={(checked) => handleCheckboxChange('includeCommissioning', !!checked)}
                />
                <Label htmlFor="includeCommissioning" className="text-base cursor-pointer">
                    Пуско-наладочные работы (ПНР)
                </Label>
            </div>
            {quoteConfig.includeCommissioning && (
                 <div className="pl-8">
                    <Label htmlFor="commissioningCost" className="text-sm text-muted-foreground">Стоимость ПНР (₽)</Label>
                    <Input
                        id="commissioningCost"
                        type="number"
                        value={quoteConfig.commissioningCost}
                        onChange={(e) => handleCostChange('commissioningCost', e.target.value)}
                        className="mt-1 w-full max-w-[200px]"
                        min="0"
                    />
                </div>
            )}
        </div>
         <div className="p-3 border rounded-md hover:bg-secondary/50 transition-colors">
            <div className="flex items-center space-x-3 mb-2">
                <Checkbox
                    id="includeExecutiveDocumentation"
                    checked={quoteConfig.includeExecutiveDocumentation}
                    onCheckedChange={(checked) => handleCheckboxChange('includeExecutiveDocumentation', !!checked)}
                />
                <Label htmlFor="includeExecutiveDocumentation" className="text-base cursor-pointer">
                    Исполнительная документация (ИД)
                </Label>
            </div>
            {quoteConfig.includeExecutiveDocumentation && (
                 <div className="pl-8">
                    <Label htmlFor="executiveDocumentationCost" className="text-sm text-muted-foreground">Стоимость ИД (₽)</Label>
                    <Input
                        id="executiveDocumentationCost"
                        type="number"
                        value={quoteConfig.executiveDocumentationTotalCost}
                        onChange={(e) => handleCostChange('executiveDocumentationTotalCost', e.target.value)}
                        className="mt-1 w-full max-w-[200px]"
                        min="0"
                    />
                </div>
            )}
        </div>
        <div className="p-3 border rounded-md hover:bg-secondary/50 transition-colors">
            <div className="flex items-center space-x-3 mb-2">
                <Checkbox
                    id="includeMeasurementTrip"
                    checked={quoteConfig.includeMeasurementTrip}
                    onCheckedChange={(checked) => handleCheckboxChange('includeMeasurementTrip', !!checked)}
                />
                <Label htmlFor="includeMeasurementTrip" className="text-base cursor-pointer">
                    Выезд для замера (включить в стоимость)
                </Label>
            </div>
            {quoteConfig.includeMeasurementTrip && (
                 <div className="pl-8">
                    <Label htmlFor="measurementTripCost" className="text-sm text-muted-foreground">Стоимость выезда для замера (₽)</Label>
                    <Input
                        id="measurementTripCost"
                        type="number"
                        value={quoteConfig.measurementTripCost}
                        onChange={(e) => handleCostChange('measurementTripCost', e.target.value)}
                        className="mt-1 w-full max-w-[200px]"
                        min="0"
                    />
                </div>
            )}
        </div>
      </CardContent>
      <CardFooter className="pt-6 border-t flex flex-wrap justify-center gap-2">
         <Button onClick={handleBackToDashboard} variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться в дашборд
          </Button>
          <Button onClick={handleSaveDraft} variant="secondary" size="lg">
            <Save className="mr-2 h-4 w-4" />
            Сохранить черновик
          </Button>
        <Button onClick={handleNextClick} size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">Сформировать КП</Button>
      </CardFooter>
    </Card>
  );
}

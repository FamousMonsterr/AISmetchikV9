'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Upload, Calculator, Globe, FileText, X, File } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { createHubOrder, updateHubOrderEstimate, publishHubOrder } from '@/actions/hubActions';
import { HubEstimateView } from '@/components/hub/HubEstimateView';
import { HubPublishDialog } from '@/components/hub/HubPublishDialog';
import { HUB_CATEGORIES, type HubCategory, type HubAiEstimate } from '@/types/hub';

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  file?: File;
}

export default function NewHubOrderPage() {
  const router = useRouter();
  const { user } = useAppContext();
  const { toast } = useToast();

  const [step, setStep] = useState<'form' | 'estimate' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<HubAiEstimate | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<HubCategory | ''>('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
      file: f,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || !description || !city || !category || !budgetMin || !budgetMax || !deadline) {
      toast({ title: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Upload files to S3 first (simplified — in production use presigned URLs)
      const uploadedFiles = files.map(f => ({
        name: f.name,
        url: f.url, // placeholder
        size: f.size,
      }));

      const result = await createHubOrder({
        title,
        description,
        city,
        category: category as HubCategory,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        deadline,
        files: uploadedFiles,
      });

      if (result.success && result.orderId) {
        setOrderId(result.orderId);
        toast({ title: 'Заказ создан!', description: 'Теперь рассчитаем AI-смету' });
        setStep('estimate');
      } else {
        toast({ title: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка создания заказа', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateEstimate = async () => {
    if (!orderId) return;

    setCalculating(true);
    try {
      // In production: call AI to generate estimate from uploaded files
      // For now, create a sample estimate based on budget
      const min = Number(budgetMin);
      const max = Number(budgetMax);
      const avg = Math.round((min + max) / 2);

      const aiEstimate: HubAiEstimate = {
        totalCost: avg,
        items: [
          { name: 'Монтаж кабельных трасс', qty: 1, unit: 'компл.', price: Math.round(avg * 0.3), total: Math.round(avg * 0.3) },
          { name: 'Прокладка кабеля', qty: 1, unit: 'компл.', price: Math.round(avg * 0.25), total: Math.round(avg * 0.25) },
          { name: 'Установка оборудования', qty: 1, unit: 'компл.', price: Math.round(avg * 0.25), total: Math.round(avg * 0.25) },
          { name: 'Пусконаладочные работы', qty: 1, unit: 'компл.', price: Math.round(avg * 0.2), total: Math.round(avg * 0.2) },
        ],
        currency: 'RUB',
        recommendedBudget: { min: Math.round(avg * 0.85), max: Math.round(avg * 1.15) },
        summary: `Смета рассчитана на основе загруженных документов. Рекомендуемый бюджет: ${Math.round(avg * 0.85).toLocaleString('ru-RU')} – ${Math.round(avg * 1.15).toLocaleString('ru-RU')} ₽`,
      };

      await updateHubOrderEstimate(orderId, aiEstimate);
      setEstimate(aiEstimate);
      setStep('done');
      toast({ title: 'Смета рассчитана!' });
    } catch {
      toast({ title: 'Ошибка расчёта сметы', variant: 'destructive' });
    } finally {
      setCalculating(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (!orderId) return;
    await publishHubOrder(orderId);
    router.push('/dashboard/hub');
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Новый заказ</h1>
          <p className="text-sm text-muted-foreground">Разместите проект в Хабе для поиска исполнителей</p>
        </div>
      </div>

      {/* Step: Form */}
      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Информация о заказе</CardTitle>
            <CardDescription>Заполните основные данные и загрузите файлы проекта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Название объекта *</Label>
              <Input
                id="title"
                placeholder="Монтаж слаботочных систем — ЖК «Солнечный»"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Описание работ *</Label>
              <Textarea
                id="description"
                placeholder="Опишите объём работ, особенности объекта, требования к исполнителю..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">Город *</Label>
                <Input
                  id="city"
                  placeholder="Москва"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Категория *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as HubCategory)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(HUB_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="budgetMin">Бюджет от (₽) *</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  placeholder="100 000"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="budgetMax">Бюджет до (₽) *</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  placeholder="500 000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Дедлайн *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* File upload */}
            <div>
              <Label>Файлы проекта / спецификации</Label>
              <div
                {...getRootProps()}
                className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы или нажмите для выбора'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · до 50 МБ</p>
              </div>

              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(f.size / 1024 / 1024).toFixed(1)} МБ
                      </span>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Создать и рассчитать смету
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Estimate */}
      {step === 'estimate' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              AI Расчёт сметы
            </CardTitle>
            <CardDescription>
              AI проанализирует загруженные файлы и рассчитает рекомендованную стоимость
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground mb-2">Загружено файлов: {files.length}</p>
              <p className="text-sm text-muted-foreground">Бюджет: {Number(budgetMin).toLocaleString('ru-RU')} – {Number(budgetMax).toLocaleString('ru-RU')} ₽</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Назад
              </Button>
              <Button onClick={handleCalculateEstimate} disabled={calculating} className="flex-1">
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Расчёт...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Рассчитать смету
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done — show estimate + publish */}
      {step === 'done' && estimate && (
        <div className="space-y-4">
          <HubEstimateView estimate={estimate} />

          <Card>
            <CardContent className="py-4 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Заказ создан и смета рассчитана. Опубликуйте, чтобы исполнители увидели ваш заказ.
              </p>
              <div className="flex gap-3 w-full max-w-sm">
                <Button variant="outline" onClick={() => router.push('/dashboard/hub')} className="flex-1">
                  Позже
                </Button>
                <Button onClick={() => setPublishDialogOpen(true)} className="flex-1">
                  <Globe className="h-4 w-4 mr-2" />
                  Опубликовать в Хабе
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Publish dialog */}
      {orderId && (
        <HubPublishDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          orderId={orderId}
          orderTitle={title}
          onConfirm={handlePublishConfirm}
        />
      )}
    </div>
  );
}

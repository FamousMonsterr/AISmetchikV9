'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  Upload,
  FileText,
  Zap,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PDF_ENGINES = [
  { id: 'cloudflare-ai', name: 'Cloudflare AI (бесплатный)' },
  { id: 'native', name: 'Native' },
  { id: 'mistral-ocr', name: 'Mistral OCR' },
  { id: 'pdf-text', name: 'PDF Text' },
];

export default function S3TestBench() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Модели из каталога
  const [models, setModels] = useState<string[]>(['google/gemini-2.5-flash-lite']);
  const [model, setModel] = useState('google/gemini-2.5-flash-lite');
  const [pdfEngine, setPdfEngine] = useState('cloudflare-ai');
  const [prompt, setPrompt] = useState('Прочитай этот PDF и верни его содержание в markdown. Сохраняй структуру: заголовки, списки, таблицы.');

  // Файл
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; objectKey?: string; accessUrl?: string } | null>(null);

  // Состояние
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ai-config')
      .then(r => r.json())
      .then(config => {
        const orModels = (config.apiModels || [])
          .filter((m: any) => m.provider === 'openrouter')
          .map((m: any) => m.value);
        if (orModels.length) setModels(orModels);
      })
      .catch(() => {});
  }, []);

  // Загрузка файла в S3
  const handleUpload = () => {
    if (!fileInputRef.current?.files?.[0]) return;
    const file = fileInputRef.current.files[0];

    setUploadedFile({ name: file.name, type: file.type, size: file.size });
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/test-ai/upload', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setUploadedFile(prev => prev ? { ...prev, objectKey: data.objectKey, accessUrl: data.accessUrl } : null);
        toast({ title: 'Загружено', description: `${data.objectKey} (${Math.round(data.size / 1024)}KB)` });
      })
      .catch(err => {
        toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
      });
  };

  // Отправка в OpenRouter
  const handleSend = async () => {
    if (!uploadedFile?.accessUrl) {
      toast({ title: 'Ошибка', description: 'Сначала загрузите файл', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setResult(null);

    const reqBody = {
      model,
      prompt,
      file: {
        fileUri: uploadedFile.accessUrl,
        objectKey: uploadedFile.objectKey,
        mimeType: uploadedFile.type,
        fileName: uploadedFile.name,
      },
      pdfEngine,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {

      const res = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout = err.name === 'AbortError';
      setResult({ error: isTimeout ? 'Таймаут 120с — нет ответа от сервера' : err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Тест OpenRouter + File Parser
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">

          {/* 1. Загрузка файла */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">1. Загрузить файл</h4>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.txt,.png,.jpg" />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Выбрать файл
              </Button>
            </div>
            {uploadedFile && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <p><b>Файл:</b> {uploadedFile.name} ({uploadedFile.type}, {Math.round(uploadedFile.size / 1024)}KB)</p>
                {uploadedFile.objectKey && <p><b>Object Key:</b> {uploadedFile.objectKey}</p>}
                {uploadedFile.accessUrl && <p className="break-all"><b>URL:</b> {uploadedFile.accessUrl}</p>}
              </div>
            )}
          </div>

          <Separator />

          {/* 2. Настройки */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">2. Настройки запроса</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Модель OpenRouter</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PDF Engine (плагин)</Label>
                <Select value={pdfEngine} onValueChange={setPdfEngine}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PDF_ENGINES.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Промпт</Label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="text-sm" />
            </div>
          </div>

          <Separator />

          {/* 3. Отправка */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">3. Отправить в OpenRouter</h4>
            <Button onClick={handleSend} disabled={isSending || !uploadedFile?.accessUrl}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Отправить с плагином {pdfEngine}
            </Button>
          </div>

          {/* 4. Результат */}
          {result && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">4. Результат</h4>

                {/* Что отправили */}
                {result.requestSent && (
                  <details>
                    <summary className="text-xs text-muted-foreground cursor-pointer">Тело запроса (что отправили)</summary>
                    <pre className="mt-2 p-3 bg-muted/50 rounded text-xs font-mono max-h-[200px] overflow-y-auto">
                      {JSON.stringify(result.requestSent, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Ответ или ошибка */}
                {result.error ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">ОШИБКА</p>
                    <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                      {result.error}
                    </pre>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                      УСПЕХ — {result.engine} — {result.durationMs}ms
                    </p>
                    <div className="max-h-[300px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">{result.text}</pre>
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Raw JSON ответ</summary>
                  <pre className="mt-2 p-3 bg-muted/50 rounded text-xs font-mono max-h-[200px] overflow-y-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </>
          )}

        </CardContent>
      )}
    </Card>
  );
}

// src/components/S3Uploader.tsx
"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud, CheckCircle, AlertTriangle, Bot, Lock, Unlock } from 'lucide-react';
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import axios from 'axios';
import { runTestPrompt } from "@/actions/adminActions";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import aiConfig from '@/lib/ai-config.json';
import { useAppContext } from "@/contexts/AppContext";

const DEFAULT_PROMPT = "Опиши содержимое этого файла в 50-500 символов. Если не можешь получить доступ к файлу или прочитать его, объясни, почему.\n\nСсылка на файл: {{fileUrl}}";
const MISTRAL_PROMPT = "What are the main points in this document?";

export function S3Uploader() {
  const { user } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [testUrl, setTestUrl] = useState("");
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{success: boolean, message: string} | null>(null);
  
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isPromptLocked, setIsPromptLocked] = useState(true);
  const [isPublicLink, setIsPublicLink] = useState(false);
  const [useMistralOcr, setUseMistralOcr] = useState(false);
  
  const adminModels = user?.systemRole === 'Super Admin' ? aiConfig.apiModels : [];
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    if (adminModels.length > 0) {
        setSelectedModel(adminModels[0].value);
    }
  }, [adminModels]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setTestUrl("");
      setAiTestResult(null);
      setUploadProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Ошибка", description: "Пожалуйста, выберите файл для загрузки.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setError(null);
    setTestUrl("");
    setAiTestResult(null);
    setUploadProgress(0);

    try {
      toast({ description: "Получение ссылок для загрузки..." });
      const presignedUrlResponse = await fetch("/api/s3-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          isPublic: isPublicLink,
        }),
      });

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json();
        throw new Error(errorData.error || "Не удалось получить ссылку для загрузки.");
      }

      const { uploadUrl, accessUrl } = await presignedUrlResponse.json();
      
      toast({ description: "Загрузка файла в хранилище..." });
      await axios.put(uploadUrl, file, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
              }
          }
      });
      
      toast({ title: "Успех!", description: "Файл успешно загружен в S3." });
      setTestUrl(accessUrl);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка.";
      setError(errorMessage);
      toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  const handleAiTest = async () => {
      if (!testUrl) {
          toast({ title: "Ошибка", description: "URL файла не определен. Сначала загрузите файл.", variant: "destructive"});
          return;
      }
      setIsAiTesting(true);
      setAiTestResult(null);
      
      // If OCR is used, the prompt should not contain the URL placeholder
      const finalPrompt = useMistralOcr ? prompt.replace('{{fileUrl}}', '') : prompt;
      
      const result = await runTestPrompt({ 
          prompt: finalPrompt,
          model: selectedModel,
          fileUri: testUrl,
          mimeType: file?.type, // Pass mimeType
          useMistralOcr: useMistralOcr,
      });

      setAiTestResult(result);
      setIsAiTesting(false);
  };
  
  useEffect(() => {
    if (useMistralOcr) {
      setPrompt(MISTRAL_PROMPT);
      setIsPromptLocked(true);
    } else {
      setPrompt(DEFAULT_PROMPT);
      setIsPromptLocked(true);
    }
  }, [useMistralOcr]);

  return (
    <div className="space-y-4">
      {/* Uploader Section */}
      <div
        {...getRootProps()}
        className={cn(
          "p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[160px]",
          isDragActive ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
        {file ? (
          <p className="font-semibold text-primary">{file.name}</p>
        ) : (
          <>
            <p className="font-semibold">Перетащите файл сюда или нажмите для выбора</p>
            <p className="text-xs text-muted-foreground">Максимальный размер: 50MB</p>
          </>
        )}
      </div>

      {isUploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center space-x-2">
            <Switch id="public-link-toggle" checked={isPublicLink} onCheckedChange={setIsPublicLink} disabled={isUploading}/>
            <Label htmlFor="public-link-toggle">Публичная ссылка (7 дней)</Label>
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !file}>
          {isUploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка...</>
          ) : ( "Загрузить и получить ссылку" )}
        </Button>
      </div>

       {error && (
         <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
                 <AlertTriangle className="h-5 w-5 text-red-600"/>
                 <p className="font-semibold text-red-800">Ошибка</p>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* AI Test Section */}
      <div className="mt-6 pt-6 border-t space-y-4">
         <div className="space-y-2">
             <Label htmlFor="test-url-input">URL для теста с AI</Label>
             <Input 
                id="test-url-input"
                placeholder="Вставьте URL или загрузите файл выше"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
            />
         </div>
         <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="model-select">Модель для теста</Label>
                 <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model-select"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {adminModels.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                 </Select>
             </div>
             <div className="flex items-center space-x-2 pt-6">
                <Switch id="mistral-ocr-toggle" checked={useMistralOcr} onCheckedChange={setUseMistralOcr} />
                <Label htmlFor="mistral-ocr-toggle">Использовать OCR</Label>
            </div>
         </div>
         <div className="space-y-2">
            <div className="flex justify-between items-center">
                 <Label htmlFor="prompt-textarea">Промпт для AI (используйте '{{fileUrl}}' для подстановки ссылки)</Label>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     {isPromptLocked ? <Lock className="h-3 w-3"/> : <Unlock className="h-3 w-3"/>}
                     <Switch id="lock-prompt" checked={!isPromptLocked} onCheckedChange={(checked) => setIsPromptLocked(!checked)} />
                 </div>
            </div>
            <Textarea 
                id="prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isPromptLocked}
                className="font-mono h-24"
            />
         </div>
         <Button onClick={handleAiTest} disabled={isAiTesting || !testUrl}>
            {isAiTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Тест с AI
         </Button>
          {aiTestResult && (
            <div className={cn("p-4 border rounded-lg", aiTestResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                <div className="flex items-center justify-center gap-2">
                    {aiTestResult.success ? <CheckCircle className="h-5 w-5 text-green-600"/> : <AlertTriangle className="h-5 w-5 text-red-600"/>}
                    <p className={cn("font-semibold", aiTestResult.success ? "text-green-800" : "text-red-800")}>
                        {aiTestResult.success ? "AI успешно получил доступ к файлу!" : "AI не смог получить доступ к файлу"}
                    </p>
                </div>
                <Textarea readOnly value={aiTestResult.message} className="mt-2 text-xs font-mono h-32 bg-white/50" />
            </div>
          )}
      </div>
    </div>
  );
}

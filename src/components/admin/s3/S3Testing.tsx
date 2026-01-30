// @ts-nocheck
// src/components/admin/s3/S3Testing.tsx
"use client";

import { useState, useCallback, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testS3Connection, listBuckets, createBucket, getBucketCors } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, ChevronRight, Hash, Database, Link as LinkIcon, FileUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useDropzone } from 'react-dropzone';
import { getFileSha1 } from '@/lib/utils';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EnvSettings } from '@/actions/adminActions';


// A more detailed state to manage the step-by-step process
type TestState = {
    file: File | null;
    fileHash: string | null;
    cachedData: any | null;
    isUrlValid: boolean | null;
    presignedUploadUrl: string | null;
    finalAccessUrl: string | null;
    uploadProgress: number;
    currentStepError: string | null;
    currentStepInfo: string | null;
    lastUpload?: {
      uploadUrl: string;
      accessUrl: string;
      objectKey: string;
    } | null;
};

const initialState: TestState = {
    file: null, fileHash: null, cachedData: null, isUrlValid: null,
    presignedUploadUrl: null, finalAccessUrl: null, uploadProgress: 0, currentStepError: null,
    currentStepInfo: null,
    lastUpload: null,
};

const ACTIVE_PRESET_VALUE = "__active__";

export function S3Testing({ settings }: { settings: EnvSettings | null }) {
  // New state for the step-by-step tester
  const [testState, setTestState] = useState<TestState>(initialState);
  const [isLoading, startStepTransition] = useTransition();
  const [status, setStatus] = useState<Record<string, 'idle' | 'ok' | 'fail'>>({
    ping: 'idle',
    buckets: 'idle',
    cors: 'idle',
    upload: 'idle',
  });
  const [stepStatus, setStepStatus] = useState<Record<string, 'idle' | 'run' | 'ok' | 'fail'>>({
    hash: 'idle',
    cache: 'idle',
    url: 'idle',
    refresh: 'idle',
    upload: 'idle',
  });
  const [selectedPreset, setSelectedPreset] = useState<string>(ACTIVE_PRESET_VALUE);
  const presets = settings?.s3Presets ?? [];
  const resolvePresetId = (value: string) => (value === ACTIVE_PRESET_VALUE ? undefined : value);


  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setTestState({ ...initialState, file: acceptedFiles[0] });
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  const resetAfterFileSelect = () => {
    setTestState(prev => ({
      ...initialState,
      file: prev.file, // keep the file
    }));
  };
  
  useEffect(() => {
    resetAfterFileSelect();
  }, [testState.file]);

  const statusMap: Record<number, keyof typeof stepStatus> = {
    1: 'hash',
    2: 'cache',
    3: 'url',
    4: 'refresh',
    5: 'upload',
  };

  const handleStep = async (step: number) => {
    startStepTransition(async () => {
        setTestState(prev => ({...prev, currentStepError: null, currentStepInfo: null}));
        const key = statusMap[step];
        if (key) setStepStatus((s) => ({ ...s, [key]: 'run' }));
        try {
            switch(step) {
                case 1: // Calculate Hash
                    if (!testState.file) throw new Error("Файл не выбран.");
                    const hash = await getFileSha1(testState.file);
                    setTestState(prev => ({ ...prev, fileHash: hash, cachedData: null, isUrlValid: null, finalAccessUrl: null, currentStepInfo: "Хеш файла рассчитан." }));
                    break;
                case 2: // Check Cache
                    if (!testState.fileHash) throw new Error("Хеш файла не рассчитан.");
                    const cacheRef = doc(db, 's3_file_cache', testState.fileHash);
                    const cacheSnap = await getDoc(cacheRef);
                    if (cacheSnap.exists()) {
                        setTestState(prev => ({ ...prev, cachedData: cacheSnap.data(), isUrlValid: null, finalAccessUrl: null }));
                        setTestState(prev => ({ ...prev, currentStepInfo: "Запись найдена в кеше." }));
                    } else {
                        setTestState(prev => ({ ...prev, cachedData: null, isUrlValid: null, finalAccessUrl: null }));
                        setTestState(prev => ({ ...prev, currentStepInfo: "Запись в кеше не найдена. Требуется загрузка." }));
                    }
                    break;
                case 3: // Validate URL
                    if (!testState.cachedData?.urlExpirationTimestamp) throw new Error("Нет данных кеша для проверки.");
                    const expirationDate = (() => {
                      const value = testState.cachedData.urlExpirationTimestamp;
                      if (!value) return null;
                      if (typeof value?.toDate === 'function') return value.toDate();
                      if (value instanceof Date) return value;
                      if (typeof value === 'number' || typeof value === 'string') return new Date(value);
                      return null;
                    })();
                    const isValid = !!expirationDate && expirationDate > new Date();
                    setTestState(prev => ({ ...prev, isUrlValid: isValid, finalAccessUrl: isValid ? prev.cachedData.accessUrl : null, currentStepInfo: `Ссылка ${isValid ? 'валидна' : 'истекла'}.` }));
                    break;
                case 4: // Refresh URL
                    if (!testState.cachedData?.objectKey) throw new Error("Нет ключа объекта для обновления ссылки.");
                    const refreshResponse = await fetch("/api/s3-refresh-url", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ objectKey: testState.cachedData.objectKey, presetId: resolvePresetId(selectedPreset) }),
                    });
                    if (!refreshResponse.ok) throw new Error("Не удалось обновить ссылку.");
                    const { newAccessUrl, newExpirationTimestamp } = await refreshResponse.json();
                     if (!newExpirationTimestamp) throw new Error("API не вернуло временную метку для новой ссылки.");
                    await setDoc(doc(db, 's3_file_cache', testState.fileHash!), { accessUrl: newAccessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(newExpirationTimestamp/1000), 0) }, { merge: true });
                    setTestState(prev => ({ ...prev, finalAccessUrl: newAccessUrl, isUrlValid: true, currentStepInfo: "Ссылка на файл успешно обновлена." }));
                    break;
                case 5: // Get Upload URL & Upload
                    if (!testState.file || !testState.fileHash) throw new Error("Файл не выбран или хеш не рассчитан.");
                    const presignedUrlResponse = await fetch("/api/s3-upload", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName: testState.file.name, fileType: testState.file.type, isPublic: false, presetId: resolvePresetId(selectedPreset) }),
                    });
                    if (!presignedUrlResponse.ok) throw new Error((await presignedUrlResponse.json()).error);
                    const { uploadUrl, accessUrl, objectKey, urlExpirationTimestamp } = await presignedUrlResponse.json();

                    if (!urlExpirationTimestamp) throw new Error("API не вернуло временную метку для ссылки.");
                    
                    setTestState(prev => ({ ...prev, presignedUploadUrl: uploadUrl }));
                    
                    await axios.put(uploadUrl, testState.file, { headers: { 'Content-Type': testState.file.type } });
                    
                    await setDoc(doc(db, 's3_file_cache', testState.fileHash!), {
                        fileSha1: testState.fileHash, objectKey, accessUrl, 
                        urlExpirationTimestamp: new Timestamp(Math.floor(urlExpirationTimestamp/1000), 0),
                        createdAt: serverTimestamp(), fileName: testState.file.name
                    });

                    setTestState(prev => ({ ...prev, finalAccessUrl: accessUrl, lastUpload: { uploadUrl, accessUrl, objectKey }, currentStepInfo: "Файл загружен, ссылка для доступа получена." }));
                    break;
            }
            if (key) setStepStatus((s) => ({ ...s, [key]: 'ok' }));
        } catch (error: any) {
            const errorMessage = `Ошибка на шаге ${step}: ${error.message}`;
            setTestState(prev => ({ ...prev, currentStepError: errorMessage }));
            if (key) setStepStatus((s) => ({ ...s, [key]: 'fail' }));
        }
    });
  };
  
  const renderStatusIcon = (state: 'idle' | 'run' | 'ok' | 'fail') => {
    if (state === 'ok') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (state === 'fail') return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (state === 'run') return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    return <span className="h-5 w-5 text-muted-foreground">•</span>;
  };

  const renderStep = (stepNumber: number, id: keyof typeof stepStatus, title: string, isDisabled: boolean, onClick: () => void, children?: React.ReactNode) => {
      const state = stepStatus[id] || 'idle';
      return (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
             <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 bg-muted border-border">
                {renderStatusIcon(state)}
             </div>
             {stepNumber < 5 && <div className="w-0.5 h-6 bg-border mt-1"/>}
          </div>
          <div className="flex-1 space-y-2 pb-8">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{title}</h4>
              <span className="text-xs text-muted-foreground uppercase">{state === 'idle' ? 'ожидает' : state === 'run' ? 'выполняется' : state === 'ok' ? 'успех' : 'ошибка'}</span>
            </div>
            <Button onClick={onClick} disabled={isDisabled || isLoading} size="sm">Выполнить</Button>
            {children}
          </div>
        </div>
      )
  }

  const statusBadge = (key: string) => {
    const value = status[key] || 'idle';
    const map = { idle: 'text-muted-foreground', ok: 'text-green-600', fail: 'text-destructive' } as const;
    return <span className={`text-xs ${map[value]}`}>{value === 'ok' ? '✔' : value === 'fail' ? '✖' : '…'}</span>;
  };

  const runMicroAction = async (key: keyof typeof status, action: () => Promise<void>) => {
    setStatus((s) => ({ ...s, [key]: 'idle' }));
    try {
      await action();
      setStatus((s) => ({ ...s, [key]: 'ok' }));
    } catch (e: any) {
      setStatus((s) => ({ ...s, [key]: 'fail' }));
      throw e;
    }
  };

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="testing" className="border rounded-lg">
        <AccordionTrigger className="p-4"><h4 className="font-semibold flex items-center gap-2"><Zap/>Тестирование и отладка S3</h4></AccordionTrigger>
        <AccordionContent className="p-4 pt-0 space-y-4">
            <Card>
            <CardHeader>
                <CardTitle>Быстрая проверка подключения</CardTitle>
                <CardDescription>Микрошаги: ping → список бакетов → CORS → загрузка.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div className="w-full md:w-auto">
                <Label>Шаблон S3</Label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Активный шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACTIVE_PRESET_VALUE}>Активный (по умолчанию)</SelectItem>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={async () => {
                startStepTransition(async () => {
                  try {
                    await runMicroAction('ping', async () => {
                      const res = await testS3Connection(resolvePresetId(selectedPreset));
                      if (!res.success) throw new Error(res.message);
                      setTestState((prev) => ({ ...prev, currentStepInfo: res.message }));
                    });
                  } catch (e: any) {
                    setTestState((prev) => ({ ...prev, currentStepError: e.message }));
                  }
                });
              }}>Ping S3 {statusBadge('ping')}</Button>
              <Button variant="outline" size="sm" onClick={async () => {
                startStepTransition(async () => {
                  try {
                    await runMicroAction('buckets', async () => {
                      const res = await listBuckets(resolvePresetId(selectedPreset));
                      if (!res.success) throw new Error(res.message);
                      setTestState((prev) => ({ ...prev, currentStepInfo: `Бакеты: ${(res.buckets || []).join(', ') || 'пусто'}` }));
                    });
                  } catch (e: any) {
                    setTestState((prev) => ({ ...prev, currentStepError: e.message }));
                  }
                });
              }}>Список бакетов {statusBadge('buckets')}</Button>
              <Button variant="outline" size="sm" onClick={async () => {
                startStepTransition(async () => {
                  try {
                    await runMicroAction('cors', async () => {
                      const res = await getBucketCors(resolvePresetId(selectedPreset));
                      if (!res.success) throw new Error(res.message);
                      setTestState((prev) => ({ ...prev, currentStepInfo: 'CORS получен/валид.' }));
                    });
                  } catch (e: any) {
                    setTestState((prev) => ({ ...prev, currentStepError: e.message }));
                  }
                });
              }}>Проверить CORS {statusBadge('cors')}</Button>
              <Button variant="outline" size="sm" onClick={() => {
                startStepTransition(async () => {
                  try {
                    await runMicroAction('upload', async () => {
                      if (!testState.file) throw new Error("Выберите файл для теста");
                      await handleStep(5);
                    });
                  } catch (e: any) {
                    setTestState((prev) => ({ ...prev, currentStepError: e.message }));
                  }
                });
              }}>Загрузить тестовый файл {statusBadge('upload')}</Button>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle>Пошаговая отладка загрузки и анализа</CardTitle>
                <CardDescription>Выполняйте каждый шаг вручную, чтобы проверить цепочку presigned URL + кеш.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* File Dropzone */}
                <div {...getRootProps()} className={cn("p-4 border-2 border-dashed rounded-lg text-center cursor-pointer", isDragActive && "border-primary")}>
                    <input {...getInputProps()} />
                    <div className="flex items-center justify-center gap-3">
                       <FileUp className="h-8 w-8 text-muted-foreground" />
                       <div>
                           <p className="font-semibold">{testState.file ? testState.file.name : "Шаг 1: Выберите или перетащите файл"}</p>
                           {testState.file && <p className="text-xs text-muted-foreground">{(testState.file.size / 1024).toFixed(2)} KB</p>}
                       </div>
                    </div>
                </div>
                
                {testState.currentStepError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertDescription className="whitespace-pre-wrap break-all">{testState.currentStepError}</AlertDescription></Alert>}
                {testState.currentStepInfo && <Alert variant="default"><AlertDescription className="whitespace-pre-wrap break-all">{testState.currentStepInfo}</AlertDescription></Alert>}

                {/* Steps */}
                <div className="space-y-0">
                    {renderStep(1, 'hash', "Рассчитать SHA-1 хеш", !testState.file, () => handleStep(1), 
                       testState.fileHash && <Alert variant="default" className="mt-2"><Hash className="h-4 w-4"/><AlertDescription className="break-all">{testState.fileHash}</AlertDescription></Alert>
                    )}
                    {renderStep(2, 'cache', "Проверить кеш в Firestore", !testState.fileHash, () => handleStep(2),
                       <>
                         {testState.cachedData && <Alert variant="default" className="mt-2"><Database className="h-4 w-4"/><AlertDescription className="break-all">Кеш найден. Ключ объекта: {testState.cachedData.objectKey}</AlertDescription></Alert>}
                         {testState.cachedData === null && testState.fileHash && <Alert variant="outline" className="mt-2"><AlertDescription>Кеш не найден. Перейдите к шагу 5.</AlertDescription></Alert>}
                       </>
                    )}
                    {renderStep(3, 'url', "Проверить валидность URL", !testState.cachedData, () => handleStep(3),
                       <>
                         {testState.isUrlValid === true && <Alert variant="default" className="mt-2 text-green-700 border-green-200"><LinkIcon className="h-4 w-4"/><AlertDescription>URL валиден. Переходите к шагу 5.</AlertDescription></Alert>}
                         {testState.isUrlValid === false && <Button onClick={() => handleStep(4)} disabled={isLoading} className="w-full justify-between mt-2" variant="destructive">Обновить URL<ChevronRight/></Button>}
                       </>
                    )}
                    {renderStep(4, 'refresh', "Обновить ссылку (если истекла)", !testState.cachedData, () => handleStep(4))}
                    {renderStep(5, 'upload', "Загрузить новый файл", !testState.file || testState.cachedData !== null, () => handleStep(5),
                         testState.finalAccessUrl && (
                           <div className="space-y-2 mt-2">
                             <Alert variant="default">
                               <LinkIcon className="h-4 w-4"/>
                               <AlertDescription>URL для теста: <code className="font-mono text-xs break-all">{testState.finalAccessUrl}</code></AlertDescription>
                             </Alert>
                             {testState.lastUpload && (
                               <div className="text-xs text-muted-foreground space-y-1">
                                 <div>Upload URL: <span className="break-all">{testState.lastUpload.uploadUrl}</span></div>
                                 <div>Access URL: <span className="break-all">{testState.lastUpload.accessUrl}</span></div>
                                 <div>Object key: <span className="break-all">{testState.lastUpload.objectKey}</span></div>
                                 <Button size="sm" variant="outline" onClick={async () => {
                                   try {
                                     const resp = await fetch(testState.lastUpload!.accessUrl);
                                     if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                                     const blob = await resp.blob();
                                     const url = URL.createObjectURL(blob);
                                     const a = document.createElement('a');
                                     a.href = url;
                                     a.download = testState.file?.name || 'download';
                                     a.click();
                                     URL.revokeObjectURL(url);
                                   } catch (e: any) {
                                     setTestState((prev) => ({ ...prev, currentStepError: `Ошибка скачивания: ${e.message}` }));
                                   }
                                 }}>Скачать файл</Button>
                               </div>
                             )}
                           </div>
                         )
                    )}
                </div>
            </CardContent>
            </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

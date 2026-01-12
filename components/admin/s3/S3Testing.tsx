// src/components/admin/s3/S3Testing.tsx
"use client";

import { useState, useCallback, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testS3Connection, listBuckets, createBucket } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, ChevronRight, Hash, Database, Link as LinkIcon, FileUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useDropzone } from 'react-dropzone';
import { getFileSha1 } from '@/lib/utils';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


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
};

const initialState: TestState = {
    file: null, fileHash: null, cachedData: null, isUrlValid: null,
    presignedUploadUrl: null, finalAccessUrl: null, uploadProgress: 0, currentStepError: null,
};

export function S3Testing() {
  const { toast } = useToast();
  
  // New state for the step-by-step tester
  const [testState, setTestState] = useState<TestState>(initialState);
  const [isLoading, startStepTransition] = useTransition();


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

  const handleStep = async (step: number) => {
    startStepTransition(async () => {
        setTestState(prev => ({...prev, currentStepError: null}));
        try {
            switch(step) {
                case 1: // Calculate Hash
                    if (!testState.file) throw new Error("Файл не выбран.");
                    const hash = await getFileSha1(testState.file);
                    setTestState(prev => ({ ...prev, fileHash: hash, cachedData: null, isUrlValid: null, finalAccessUrl: null }));
                    toast({ description: "Хеш файла рассчитан." });
                    break;
                case 2: // Check Cache
                    if (!testState.fileHash) throw new Error("Хеш файла не рассчитан.");
                    const cacheRef = doc(db, 's3_file_cache', testState.fileHash);
                    const cacheSnap = await getDoc(cacheRef);
                    if (cacheSnap.exists()) {
                        setTestState(prev => ({ ...prev, cachedData: cacheSnap.data(), isUrlValid: null, finalAccessUrl: null }));
                        toast({ description: "Запись найдена в кеше." });
                    } else {
                        setTestState(prev => ({ ...prev, cachedData: null, isUrlValid: null, finalAccessUrl: null }));
                        toast({ description: "Запись в кеше не найдена. Требуется загрузка.", variant: 'default' });
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
                    setTestState(prev => ({ ...prev, isUrlValid: isValid, finalAccessUrl: isValid ? prev.cachedData.accessUrl : null }));
                    toast({ description: `Ссылка ${isValid ? 'валидна' : 'истекла'}.` });
                    break;
                case 4: // Refresh URL
                    if (!testState.cachedData?.objectKey) throw new Error("Нет ключа объекта для обновления ссылки.");
                    const refreshResponse = await fetch("/api/s3-refresh-url", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ objectKey: testState.cachedData.objectKey }),
                    });
                    if (!refreshResponse.ok) throw new Error("Не удалось обновить ссылку.");
                    const { newAccessUrl, newExpirationTimestamp } = await refreshResponse.json();
                     if (!newExpirationTimestamp) throw new Error("API не вернуло временную метку для новой ссылки.");
                    await setDoc(doc(db, 's3_file_cache', testState.fileHash!), { accessUrl: newAccessUrl, urlExpirationTimestamp: new Timestamp(Math.floor(newExpirationTimestamp/1000), 0) }, { merge: true });
                    setTestState(prev => ({ ...prev, finalAccessUrl: newAccessUrl, isUrlValid: true }));
                    toast({ description: "Ссылка на файл успешно обновлена." });
                    break;
                case 5: // Get Upload URL & Upload
                    if (!testState.file || !testState.fileHash) throw new Error("Файл не выбран или хеш не рассчитан.");
                    toast({description: "Получение ссылки для загрузки..."});
                    const presignedUrlResponse = await fetch("/api/s3-upload", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName: testState.file.name, fileType: testState.file.type, isPublic: false }),
                    });
                    if (!presignedUrlResponse.ok) throw new Error((await presignedUrlResponse.json()).error);
                    const { uploadUrl, accessUrl, objectKey, urlExpirationTimestamp } = await presignedUrlResponse.json();

                    if (!urlExpirationTimestamp) throw new Error("API не вернуло временную метку для ссылки.");
                    
                    setTestState(prev => ({ ...prev, presignedUploadUrl: uploadUrl }));
                    toast({description: "Загрузка файла в хранилище..."});
                    
                    await axios.put(uploadUrl, testState.file, { headers: { 'Content-Type': testState.file.type } });
                    
                    toast({description: "Сохранение данных в кеш..."});
                    await setDoc(doc(db, 's3_file_cache', testState.fileHash!), {
                        fileSha1: testState.fileHash, objectKey, accessUrl, 
                        urlExpirationTimestamp: new Timestamp(Math.floor(urlExpirationTimestamp/1000), 0),
                        createdAt: serverTimestamp(), fileName: testState.file.name
                    });

                    setTestState(prev => ({ ...prev, finalAccessUrl: accessUrl }));
                    toast({ description: "Файл загружен, ссылка для доступа получена." });
                    break;
            }
        } catch (error: any) {
             const errorMessage = `Ошибка на шаге ${step}: ${error.message}`;
             setTestState(prev => ({ ...prev, currentStepError: errorMessage }));
             toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        }
    });
  };
  
  const renderStep = (stepNumber: number, title: string, isCompleted: boolean, isDisabled: boolean, onClick: () => void, children?: React.ReactNode) => {
      return (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
             <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border-2", isCompleted ? "bg-green-500 border-green-600 text-white" : "bg-muted border-border")}>
                {isCompleted ? <CheckCircle className="h-5 w-5"/> : <span className="font-bold">{stepNumber}</span>}
             </div>
             {stepNumber < 5 && <div className="w-0.5 h-6 bg-border mt-1"/>}
          </div>
          <div className="flex-1 space-y-2 pb-8">
            <h4 className="font-semibold">{title}</h4>
            <Button onClick={onClick} disabled={isDisabled || isLoading} size="sm">Выполнить</Button>
            {children}
          </div>
        </div>
      )
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="testing" className="border rounded-lg">
        <AccordionTrigger className="p-4"><h4 className="font-semibold flex items-center gap-2"><Zap/>Тестирование и отладка S3</h4></AccordionTrigger>
        <AccordionContent className="p-4 pt-0 space-y-4">
            <Card>
            <CardHeader>
                <CardTitle>Пошаговая отладка загрузки и анализа</CardTitle>
                <CardDescription>Выполняйте каждый шаг вручную, чтобы проверить всю цепочку.</CardDescription>
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
                
                {testState.currentStepError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertDescription>{testState.currentStepError}</AlertDescription></Alert>}

                {/* Steps */}
                <div className="space-y-0">
                    {renderStep(2, "Рассчитать SHA-1 хеш", !!testState.fileHash, !testState.file, () => handleStep(1), 
                       testState.fileHash && <Alert variant="default" className="mt-2"><Hash className="h-4 w-4"/><AlertDescription className="break-all">{testState.fileHash}</AlertDescription></Alert>
                    )}
                    {renderStep(3, "Проверить кеш в Firestore", testState.cachedData !== null, !testState.fileHash, () => handleStep(2),
                       <>
                         {testState.cachedData && <Alert variant="default" className="mt-2"><Database className="h-4 w-4"/><AlertDescription className="break-all">Кеш найден. Ключ объекта: {testState.cachedData.objectKey}</AlertDescription></Alert>}
                         {testState.cachedData === null && testState.fileHash && <Alert variant="outline" className="mt-2"><AlertDescription>Кеш не найден. Перейдите к шагу 5.</AlertDescription></Alert>}
                       </>
                    )}
                    {renderStep(4, "Проверить валидность URL", testState.isUrlValid !== null, !testState.cachedData, () => handleStep(3),
                       <>
                         {testState.isUrlValid === true && <Alert variant="default" className="mt-2 text-green-700 border-green-200"><LinkIcon className="h-4 w-4"/><AlertDescription>URL валиден. Переходите к шагу 5.</AlertDescription></Alert>}
                         {testState.isUrlValid === false && <Button onClick={() => handleStep(4)} disabled={isLoading} className="w-full justify-between mt-2" variant="destructive">Обновить URL<ChevronRight/></Button>}
                       </>
                    )}
                    {renderStep(5, !!testState.finalAccessUrl, "Загрузить новый файл", !testState.file || testState.cachedData !== null, () => handleStep(5),
                         testState.finalAccessUrl && <Alert variant="default" className="mt-2"><LinkIcon className="h-4 w-4"/><AlertDescription>URL для теста: <code className="font-mono text-xs">{testState.finalAccessUrl}</code></AlertDescription></Alert>
                    )}
                </div>
            </CardContent>
            </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

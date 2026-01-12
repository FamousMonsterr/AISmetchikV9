// src/components/admin/s3/S3Info.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Info } from "lucide-react";
import { getEnvSettings, type EnvSettings } from '@/actions/adminActions';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function S3Info() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<EnvSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const currentSettings = await getEnvSettings();
        setSettings(currentSettings);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить переменные окружения.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ description: "Скопировано в буфер обмена!" });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Справочная информация</CardTitle>
        <CardDescription>Используйте эти данные для настройки внешних инструментов, таких как AWS CLI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Endpoint URL</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={settings.s3Endpoint || ''} />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(settings.s3Endpoint || '')}><Copy className="h-4 w-4"/></Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Bucket Name</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={settings.s3BucketName || ''} />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(settings.s3BucketName || '')}><Copy className="h-4 w-4"/></Button>
          </div>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Пример команды AWS CLI</AlertTitle>
          <AlertDescription>
            <code className="block bg-muted p-2 rounded-md text-xs overflow-x-auto">
              aws s3api list-buckets --endpoint-url {settings.s3Endpoint || 'https://s3.cloud.ru'}
            </code>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

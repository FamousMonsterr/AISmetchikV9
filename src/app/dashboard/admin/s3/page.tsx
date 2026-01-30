// src/app/dashboard/admin/s3/page.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { getEnvSettings, updateEnvSettings, type EnvSettings } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { isEqual } from 'lodash';

import { S3Info } from "@/components/admin/s3/S3Info";
import { S3Settings } from "@/components/admin/s3/S3Settings";
import { S3Testing } from "@/components/admin/s3/S3Testing";
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';


export default function S3AdminPage() {
    const { toast } = useToast();
    const { user } = useAppContext();
    const [initialSettings, setInitialSettings] = useState<EnvSettings>({});
    const [settings, setSettings] = useState<EnvSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const hasUnsavedChanges = !isEqual(initialSettings, settings);

    useEffect(() => {
        const fetchSettings = async () => {
          if (!user) return;
          setIsLoading(true);
          try {
            const currentSettings = await getEnvSettings({ requesterId: user.uid, requireAdmin: true });
            setSettings(currentSettings);
            setInitialSettings(currentSettings);
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
    }, [user, toast]);

    const handleSave = () => {
        if (!user || !settings) return;
        startTransition(async () => {
            const result = await updateEnvSettings(user.uid, settings);
            if (result.success) {
                toast({ title: "Успешно", description: result.message });
                setInitialSettings(settings);
            } else {
                toast({ title: "Ошибка", description: result.message, variant: "destructive" });
            }
        });
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-4">
            <S3Info />
            <S3Settings settings={settings} setSettings={setSettings as (settings: EnvSettings) => void} isPending={isPending} />
            <S3Testing settings={settings} />
             <div className="sticky bottom-6">
                <Card>
                    <CardFooter className="pt-6">
                         <Button onClick={handleSave} disabled={isPending || !hasUnsavedChanges} className="w-full">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Сохранить все настройки S3
                        </Button>
                    </CardFooter>
                </Card>
             </div>
        </div>
    );
}

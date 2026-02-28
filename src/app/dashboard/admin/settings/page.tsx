// src/app/dashboard/admin/settings/page.tsx
"use client";

import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";

const TabLoader = () => (
  <div className="flex items-center justify-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const GeneralSettings = dynamic(
  () => import('@/components/admin/GeneralSettings').then((m) => m.GeneralSettings),
  { ssr: false, loading: () => <TabLoader /> }
);
const LegalEntitySettings = dynamic(
  () => import('@/components/admin/LegalEntitySettings').then((m) => m.LegalEntitySettings),
  { ssr: false, loading: () => <TabLoader /> }
);
const EnvSettingsComponent = dynamic(
  () => import('@/components/admin/EnvSettings').then((m) => m.EnvSettings),
  { ssr: false, loading: () => <TabLoader /> }
);
const S3AdminPage = dynamic(
  () => import('../s3/page'),
  { ssr: false, loading: () => <TabLoader /> }
);

export default function AdminSettingsPage() {
  const { user } = useAppContext();
  
  if (user?.systemRole !== 'Super Admin') {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert /> Доступ запрещен</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>У вас нет прав для просмотра этого раздела.</CardDescription>
            </CardContent>
        </Card>
    );
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">Общие настройки</TabsTrigger>
        <TabsTrigger value="legal">Юр. лицо</TabsTrigger>
        <TabsTrigger value="env">Переменные API</TabsTrigger>
        <TabsTrigger value="s3">S3-хранилище</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4">
        <GeneralSettings />
      </TabsContent>
      <TabsContent value="legal" className="mt-4">
        <LegalEntitySettings />
      </TabsContent>
      <TabsContent value="env" className="mt-4">
         <EnvSettingsComponent />
      </TabsContent>
      <TabsContent value="s3" className="mt-4">
        <S3AdminPage />
      </TabsContent>
    </Tabs>
  );
}

// src/app/dashboard/admin/settings/page.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "@/components/admin/GeneralSettings";
import { LegalEntitySettings } from "@/components/admin/LegalEntitySettings";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { EnvSettings as EnvSettingsComponent } from '@/components/admin/EnvSettings';
import S3AdminPage from '../s3/page';

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

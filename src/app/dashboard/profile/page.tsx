// src/app/dashboard/profile/page.tsx
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';


const ProfileTab = dynamic(() => import('@/components/tabs/ProfileTab'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});
const BalanceTab = dynamic(() => import('@/app/dashboard/billing/page'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});
const TicketsTab = dynamic(() => import('@/app/dashboard/tickets/page'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});
const CompaniesTab = dynamic(() => import('@/app/dashboard/companies/page'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});
const PriceBaseTab = dynamic(() => import('@/app/dashboard/price-base/page'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin"/></div>,
});


function ProfilePageContent() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'profile';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Профиль и Настройки</CardTitle>
                <CardDescription>Здесь собраны все ваши персональные данные, настройки и управление финансами.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={tab} className="w-full">
                    <div className="border-b">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto rounded-none bg-transparent p-0 gap-0">
                            <TabsTrigger value="profile">Профиль</TabsTrigger>
                            <TabsTrigger value="balance">Баланс</TabsTrigger>
                            <TabsTrigger value="tickets">Мои тикеты</TabsTrigger>
                            <TabsTrigger value="companies">Мои компании</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="profile" className="mt-6">
                        <ProfileTab />
                    </TabsContent>
                    <TabsContent value="balance" className="mt-6">
                        <BalanceTab />
                    </TabsContent>
                    <TabsContent value="tickets" className="mt-6">
                        <TicketsTab />
                    </TabsContent>
                     <TabsContent value="companies" className="mt-6">
                        <CompaniesTab />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ProfilePageContent />
        </Suspense>
    )
}

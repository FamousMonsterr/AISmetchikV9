"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send } from 'lucide-react';
import { TelegramBotPanel } from '@/components/admin/bots/TelegramBotPanel';
import { VkBotPanel } from '@/components/admin/bots/VkBotPanel';

export default function AdminBotsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<'telegram' | 'vk'>('telegram');

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (requested === 'vk') {
      setTab('vk');
    } else {
      setTab('telegram');
    }
  }, [searchParams]);

  const handleTabChange = (nextValue: string) => {
    const nextTab = nextValue === 'vk' ? 'vk' : 'telegram';
    setTab(nextTab);
    router.replace(`/dashboard/admin/bots?tab=${nextTab}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bots
          </CardTitle>
          <CardDescription>
            Единый operational экран для Telegram и VK: webhook, runtime, тесты и доставляемость.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="telegram">
                <Send className="mr-2 h-4 w-4" />
                Telegram
              </TabsTrigger>
              <TabsTrigger value="vk">
                <Bot className="mr-2 h-4 w-4" />
                VK
              </TabsTrigger>
            </TabsList>
            <TabsContent value="telegram" className="mt-4">
              <TelegramBotPanel />
            </TabsContent>
            <TabsContent value="vk" className="mt-4">
              <VkBotPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

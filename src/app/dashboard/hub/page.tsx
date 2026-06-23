'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, PackageOpen, Send, Network } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { getHubOrders, getMyHubOrders, getMyHubResponses } from '@/actions/hubActions';
import { HubOrderCard } from '@/components/hub/HubOrderCard';
import { HubFilters as HubFiltersComponent } from '@/components/hub/HubFilters';
import type { HubOrder, HubFilters, HubResponse } from '@/types/hub';

export default function HubPage() {
  const router = useRouter();
  const { user } = useAppContext();
  const { toast } = useToast();

  const [tab, setTab] = useState('work');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [myOrders, setMyOrders] = useState<HubOrder[]>([]);
  const [myResponses, setMyResponses] = useState<(HubResponse & { orderTitle?: string })[]>([]);
  const [filters, setFilters] = useState<HubFilters>({});
  const [cities, setCities] = useState<string[]>([]);

  // Load public orders
  const loadOrders = useCallback(async () => {
    try {
      const data = await getHubOrders(filters);
      setOrders(data);
      // extract unique cities
      const uniqueCities = [...new Set(data.map(o => o.city))].filter(Boolean);
      setCities(uniqueCities);
    } catch {
      toast({ title: 'Ошибка загрузки заказов', variant: 'destructive' });
    }
  }, [filters, toast]);

  // Load my data
  const loadMyData = useCallback(async () => {
    try {
      const [ordersData, responsesData] = await Promise.all([
        getMyHubOrders(),
        getMyHubResponses(),
      ]);
      setMyOrders(ordersData);
      setMyResponses(responsesData);
    } catch {
      toast({ title: 'Ошибка загрузки данных', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOrders(), loadMyData()]).finally(() => setLoading(false));
  }, [loadOrders, loadMyData]);

  const handleViewOrder = (orderId: string) => {
    router.push(`/dashboard/hub/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Хаб</h1>
            <p className="text-sm text-muted-foreground">Маркетплейс заказов для монтажников</p>
          </div>
        </div>
        <Button onClick={() => router.push('/dashboard/hub/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Разместить заказ
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="work" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Найти работу
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Мои заказы
          </TabsTrigger>
        </TabsList>

        {/* Tab: Find work */}
        <TabsContent value="work" className="space-y-4">
          <HubFiltersComponent filters={filters} onChange={setFilters} cities={cities} />

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">Заказов пока нет</p>
                <p className="text-sm">Будьте первым — разместите заказ в Хабе</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <HubOrderCard key={order.id} order={order} onView={handleViewOrder} />
              ))}
            </div>
          )}

          {/* My responses */}
          {myResponses.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Send className="h-5 w-5" />
                Мои отклики
                <Badge variant="secondary">{myResponses.length}</Badge>
              </h2>
              <div className="space-y-2">
                {myResponses.map((r) => (
                  <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => handleViewOrder(r.orderId)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.orderTitle || 'Заказ'}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.proposedPrice.toLocaleString('ru-RU')} ₽ · до {new Date(r.proposedDeadline).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {r.status === 'pending' && 'Ожидает'}
                        {r.status === 'accepted' && 'Принят'}
                        {r.status === 'rejected' && 'Отклонён'}
                        {r.status === 'withdrawn' && 'Отозван'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: My orders */}
        <TabsContent value="orders" className="space-y-4">
          {myOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PackageOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">У вас пока нет заказов</p>
                <Button className="mt-3" onClick={() => router.push('/dashboard/hub/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать заказ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myOrders.map((order) => (
                <HubOrderCard key={order.id} order={order} onView={handleViewOrder} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

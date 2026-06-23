"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext, type AppUser } from '@/contexts/AppContext';
import { agreeToPartnerTerms, getReferredUsers, submitHighTierApplication } from '@/actions/partnerActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { canAccessAdminSurface, canAccessCrmSurface, resolvePostAuthRedirectUrl, resolveSurfaceUrl } from '@/lib/navigation';

// NOTE: Partner portal redirects to dashboard. Partner features are integrated into the dashboard.
// If you need to re-enable the separate partner portal, remove the redirect below.

function formatDate(value: any) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export default function PartnerPage() {
  const { user, setNavigating } = useAppContext();
  const router = useRouter();

  // Redirect partner portal to dashboard — partner features are integrated
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

// Original partner page code below (disabled)
function OriginalPartnerPage() {
  const { user, setNavigating } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);
  const [referredUsers, setReferredUsers] = useState<AppUser[]>([]);
  const [desiredTier, setDesiredTier] = useState<'Gold' | 'Platinum'>('Gold');

  const botUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/AI_Smetchik_Bot';
  const referralLink = useMemo(() => (user?.uid ? `${botUrl}?start=ref_${user.uid}` : ''), [botUrl, user?.uid]);
  const lkProjectsUrl = resolveSurfaceUrl('lk', '/dashboard');
  const lkProfileUrl = resolveSurfaceUrl('lk', '/dashboard/profile');
  const adminUrl = resolveSurfaceUrl('admin', '/dashboard/admin');
  const crmUrl = resolveSurfaceUrl('crm', '/crm');

  useEffect(() => {
    if (user && !user.isPartner) {
      router.replace(resolvePostAuthRedirectUrl(user, 'lk'));
      return;
    }
    if (!user?.uid || !user.isPartner) return;
    setIsLoadingRefs(true);
    startTransition(async () => {
      try {
        const rows = await getReferredUsers(user.uid);
        setReferredUsers(rows);
      } catch (error: any) {
        toast({ title: 'Ошибка', description: error.message || 'Не удалось загрузить партнёрскую статистику.', variant: 'destructive' });
      } finally {
        setIsLoadingRefs(false);
      }
    });
  }, [user?.uid, user?.isPartner, toast]);

  const becomePartner = () => {
    if (!user?.uid) return;
    startTransition(async () => {
      const result = await agreeToPartnerTerms({ userId: user.uid });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Готово', description: result.message });
      setNavigating(true);
      router.refresh();
    });
  };

  const requestTier = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await submitHighTierApplication({
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        desiredTier,
      });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Заявка отправлена', description: result.message });
    });
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Партнёрский кабинет</CardTitle>
            <CardDescription>Для доступа требуется авторизация.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth/login">Войти</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><a href={lkProjectsUrl}>LK</a></Button>
        <Button variant="outline" asChild><a href={lkProfileUrl}>Профиль</a></Button>
        {canAccessAdminSurface(user) ? <Button variant="outline" asChild><a href={adminUrl}>Админ</a></Button> : null}
        {canAccessCrmSurface(user) ? <Button variant="outline" asChild><a href={crmUrl}>CRM</a></Button> : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Партнёрский кабинет</CardTitle>
          <CardDescription>Управление реферальной программой, аттестацией и клиентскими регистрациями.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={user.isPartner ? 'default' : 'secondary'}>{user.isPartner ? `Статус: ${user.partnerStatus || 'Bronze'}` : 'Партнёр не активирован'}</Badge>
            <Badge variant="outline">Привлечено клиентов: {referredUsers.length}</Badge>
          </div>

          {!user.isPartner && (
            <Button onClick={becomePartner} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Стать партнёром
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="ref-link">Реферальная ссылка (Telegram)</Label>
            <Input id="ref-link" readOnly value={referralLink || 'Ссылка появится после входа'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Аттестация и уровни</CardTitle>
          <CardDescription>Подача заявки на уровни Gold / Platinum для увеличения бонусов.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={desiredTier === 'Gold' ? 'default' : 'outline'} onClick={() => setDesiredTier('Gold')}>Gold</Button>
          <Button variant={desiredTier === 'Platinum' ? 'default' : 'outline'} onClick={() => setDesiredTier('Platinum')}>Platinum</Button>
          <Button onClick={requestTier} disabled={isPending || !user.isPartner}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Отправить заявку
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Клиенты партнёра</CardTitle>
          <CardDescription>Список пользователей, зарегистрированных по вашей ссылке.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRefs ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground">Пока нет привлечённых клиентов.</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Тариф</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredUsers.map((item) => (
                    <TableRow key={item.uid}>
                      <TableCell>{item.displayName || '—'}</TableCell>
                      <TableCell>{item.email || '—'}</TableCell>
                      <TableCell>{item.plan || 'Free'}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

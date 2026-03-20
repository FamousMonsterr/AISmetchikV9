"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, CreditCard, FileText, UserCog, Ticket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileTab from "@/components/tabs/ProfileTab";
import { useAppContext } from "@/contexts/AppContext";

const quickLinks = [
  {
    href: "/dashboard/billing",
    title: "Баланс и тарифы",
    description: "Пополнение кредитов, апгрейд плана, история оплат.",
    icon: CreditCard,
  },
  {
    href: "/dashboard/tickets",
    title: "Мои тикеты",
    description: "История обращений и статусы жалоб по проектам.",
    icon: Ticket,
  },
  {
    href: "/dashboard/companies",
    title: "Мои компании",
    description: "Юрлица, контрагенты и реквизиты для документов.",
    icon: Building2,
  },
  {
    href: "/dashboard/price-base",
    title: "База цен",
    description: "Справочник цен с импортом и ручной корректировкой.",
    icon: FileText,
  },
];

export default function ProfilePage() {
  const { user } = useAppContext();
  const isAdmin = user?.systemRole === "Admin" || user?.systemRole === "Super Admin";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="uppercase tracking-[0.18em]">
              Профиль
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Аккаунт, оплата, компании и документы
            </Badge>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Профиль и настройки</CardTitle>
            <CardDescription>
              Здесь открыт основной профиль пользователя. Остальные разделы вынесены в отдельные страницы, чтобы не
              смешивать настройки с тяжёлыми списками и загрузками.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group block">
                  <div className="h-full rounded-2xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
                    <div className="flex items-start justify-between gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <CardTitle>Основные настройки</CardTitle>
          </div>
          <CardDescription>
            Подключение Telegram, подписи, аватара, шаблонов и удаление аккаунта.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileTab />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">К проектам</Link>
        </Button>
        {isAdmin ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">Админ-панель</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

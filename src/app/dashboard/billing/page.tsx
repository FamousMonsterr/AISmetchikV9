// src/app/dashboard/billing/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Mail, Loader2, Star, Zap, TrendingUp, KeySquare, HardDrive, Crown } from "lucide-react";
import { getAppSettings } from '@/actions/adminActions';
import { Badge } from '@/components/ui/badge';
import type { AppSettings } from '@/actions/adminActions';
import plansConfig from '@/lib/plans-config.json';
import { cn } from '@/lib/utils';
import { PurchaseCreditsDialog, type CreditPackage } from '@/components/PurchaseCreditsDialog';
import { InvoiceHistory } from '@/components/InvoiceHistory';
import { CreditHistory } from '@/components/CreditHistory';
import { UpgradeAccountDialog } from '@/components/UpgradeAccountDialog';

const { creditPackages, enterprisePackage } = plansConfig;

export default function BillingPage() {
  const { user, effectivePlan } = useAppContext();
  const [enterpriseEmail, setEnterpriseEmail] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);

  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Business' | 'Enterprise'>('PRO');

  useEffect(() => {
    const fetchEmail = async () => {
        setIsLoadingEmail(true);
        try {
            const settings: AppSettings = await getAppSettings();
            setEnterpriseEmail(settings.enterpriseEmail);
        } catch (error) {
            console.error("Failed to fetch app settings:", error);
            // Set a fallback email
            setEnterpriseEmail('support@example.com');
        } finally {
            setIsLoadingEmail(false);
        }
    };
    fetchEmail();
  }, []);

  const handlePurchaseClick = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setIsPurchaseDialogOpen(true);
  };

  const currentPlan = effectivePlan || 'Free';
  const nextPlan = currentPlan === 'Free' ? 'PRO' : currentPlan === 'PRO' ? 'Business' : currentPlan === 'Business' ? 'Enterprise' : null;
  const nextPlanLabel = nextPlan === 'Business'
    ? 'Business (от 3 пользователей)'
    : nextPlan === 'Enterprise'
      ? 'Enterprise (от 25 пользователей)'
      : nextPlan;

  const handleUpgradeClick = () => {
    if (!nextPlan) return;
    setUpgradeTargetRole(nextPlan);
    setIsUpgradeOpen(true);
  };


  return (
    <>
    <div className="space-y-8">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Текущий тарифный план</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <Badge className="text-lg py-1 px-4" variant={currentPlan === 'Free' ? "secondary" : "default"}>{currentPlan}</Badge>
                <p className="text-muted-foreground">
                    {currentPlan === 'PRO'
                      ? 'Вам доступны все PRO-функции, включая приватную базу цен и расширенные лимиты.'
                      : currentPlan === 'Business'
                        ? 'Вам доступны все PRO-функции плюс бизнес-возможности и корпоративные интеграции.'
                        : currentPlan === 'Enterprise'
                          ? 'Вам доступны все корпоративные возможности и максимальные лимиты.'
                          : 'Вы используете бесплатный тариф. Перейдите на PRO, чтобы разблокировать все возможности.'}
                </p>
              </CardContent>
              <CardFooter>
                 {nextPlan ? (
                    <Button onClick={handleUpgradeClick}>
                        <Crown className="mr-2 h-4 w-4" />
                        Перейти на {nextPlanLabel}
                    </Button>
                 ) : (
                    <Button disabled>
                        <Star className="mr-2 h-4 w-4" />
                        Максимальный тариф активен
                    </Button>
                 )}
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Текущий баланс</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold text-primary">{user?.credits ?? 0}</div>
                <p className="text-muted-foreground mt-1">кредитов на обработку файлов</p>
                 <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>Купленные: <span className="font-semibold text-foreground">{user?.purchasedCredits ?? 0}</span></div>
                  <div>Бонусные: <span className="font-semibold text-foreground">{user?.bonusCredits ?? 0}</span></div>
                 </div>
                 {(user?.bonusCredits ?? 0) > 0 && user?.bonusCreditsExpireAt && (
                  <p className="text-sm text-green-600 mt-2">
                    Бонусные кредиты действуют до {new Date(user.bonusCreditsExpireAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                 <p className="text-sm text-muted-foreground">1 кредит = 1 обработка файла.</p>
              </CardFooter>
            </Card>
       </div>
      
       <div>
            <h2 className="text-2xl font-bold mb-4">Пополнить баланс</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creditPackages.map((pkg) => {
                    const originalPrice = pkg.credits * creditPackages[0].pricePerCredit;
                    const savedAmount = originalPrice - pkg.totalPrice;
                    return (
                        <Card key={pkg.name} className={cn("flex flex-col", pkg.popular && "border-2 border-primary shadow-lg relative")}>
                             {pkg.popular && <Badge className="absolute -top-3 right-4">Популярный</Badge>}
                            <CardHeader>
                            <CardTitle>{pkg.name}</CardTitle>
                            <CardDescription>{pkg.credits} кредитов</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-grow">
                                <div className="text-4xl font-bold">
                                    {pkg.totalPrice.toLocaleString('ru-RU')} ₽
                                    {savedAmount > 0 && <span className="text-lg text-muted-foreground line-through ml-2">{originalPrice.toLocaleString('ru-RU')} ₽</span>}
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {savedAmount > 0 && (
                                         <li key="discount" className="flex items-center text-green-600 font-semibold">
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            Ваша выгода: {savedAmount.toLocaleString('ru-RU')} ₽ ({pkg.discount}%)
                                        </li>
                                    )}
                                    {pkg.features.map(feature => (
                                    <li key={feature} className="flex items-center">
                                        <Check className="h-4 w-4 mr-2 text-green-500" />
                                        {feature}
                                    </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => handlePurchaseClick(pkg as CreditPackage)}>
                                    <Zap className="mr-2 h-4 w-4"/>
                                    Пополнить
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
       </div>

       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HardDrive /> Собственное S3 Хранилище</CardTitle>
                <CardDescription>Подключите ваше S3-совместимое хранилище (например, Cloud.ru) для максимальной безопасности и контроля.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> Файлы хранятся в вашем бакете, а не у нас.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> Полный контроль над жизненным циклом и доступом к файлам.</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> Идеально для корпоративных политик безопасности.</li>
                </ul>
            </CardContent>
            <CardFooter>
                 <Button asChild variant="secondary" disabled={isLoadingEmail}>
                    {isLoadingEmail ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Загрузка...
                      </span>
                    ) : (
                      <a href={`mailto:${enterpriseEmail}?subject=Запрос на подключение S3 (Business/Enterprise)`}>
                        <KeySquare className="mr-2 h-4 w-4" />
                        Запросить подключение S3
                      </a>
                    )}
                </Button>
            </CardFooter>
        </Card>
      
       <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardHeader>
          <CardTitle>{enterprisePackage.name}</CardTitle>
          <CardDescription>{enterprisePackage.credits}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
                {enterprisePackage.price}
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
            {enterprisePackage.features.map(feature => (
                <li key={feature} className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                {feature}
                </li>
            ))}
            </ul>
        </CardContent>
        <CardFooter>
            <Button asChild variant="secondary" className="w-full sm:w-auto" disabled={isLoadingEmail}>
                {isLoadingEmail ? (
                    <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Загрузка...
                    </span>
                ) : (
                    <a href={`mailto:${enterpriseEmail}?subject=Запрос на тариф 'Сметный отдел'`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Обсудить условия
                    </a>
                )}
            </Button>
        </CardFooter>
      </Card>
      
      <InvoiceHistory />

      {user?.uid && (
        <CreditHistory
          currentUserId={user.uid}
          targetUserId={user.uid}
          title="История кредитов"
          description="Все начисления, списания и сгорания."
        />
      )}
      
      <p className="text-center text-sm text-muted-foreground">Оплата для Юр. лиц и ИП доступна по запросу.</p>
    </div>
    
    {selectedPackage && (
        <PurchaseCreditsDialog
            isOpen={isPurchaseDialogOpen}
            onClose={() => setIsPurchaseDialogOpen(false)}
            selectedPackage={selectedPackage}
        />
    )}

    <UpgradeAccountDialog
      isOpen={isUpgradeOpen}
      onClose={() => setIsUpgradeOpen(false)}
      targetRole={upgradeTargetRole}
    />
    </>
  );
}

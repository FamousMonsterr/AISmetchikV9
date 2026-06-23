// src/app/dashboard/bonus/page.tsx
// @ts-nocheck
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useAppContext, type AppUser } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Send, Users, BadgeDollarSign, UserPlus, Star, Trophy, Crown, Gem, CheckCircle, FileText, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReferredUsers, agreeToPartnerTerms } from '@/actions/partnerActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { HighTierPartnerDialog } from '@/components/HighTierPartnerDialog';
import promoConfig from '@/lib/promo-config.json';
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from '@/lib/motion';


const agreementText = `
### 1. Предмет Соглашения
1.1. Лицензиар предоставляет Партнеру право на привлечение новых пользователей (Клиентов) для использования Программного Обеспечения "Montage HUB" (далее - ПО).
1.2. Партнер получает вознаграждение за каждого привлеченного Клиента, совершившего первую оплату, а также процент от последующих платежей в соответствии с его партнерским статусом.

### 2. Статусы и Вознаграждение
2.1. **Бронзовый партнер:** Присваивается автоматически после принятия данного соглашения. Партнер получает 100% от первого платежа привлеченного Клиента.
2.2. **Серебряный партнер:** Присваивается после прохождения программы обучения. Партнер получает 10% от всех последующих платежей своих Клиентов.
2.3. **Золотой партнер:** Присваивается после заключения договора франшизы и оплаты паушального взноса в размере 500,000 руб. Партнер получает 40% от всех платежей.
2.4. **Платиновый партнер:** Присваивается после оплаты паушального взноса в размере 1,000,000 руб. Партнер получает 60% от всех платежей и возможность использовать ПО по модели White Label.
2.5. Каждый год проходит аттестация. При рейтинге удовлетворенности клиентов менее 70% лицензиар имеет право пересмотреть условия.
`;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const formatShortDate = (value?: any) => {
  if (!value?.toDate) return null;
  try {
    return format(value.toDate(), 'dd.MM.yyyy', { locale: ru });
  } catch {
    return null;
  }
};

const AgreementPreviewDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Партнерское соглашение</DialogTitle>
        <DialogDescription>Актуальная редакция документа.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto border rounded-md p-4 text-sm text-muted-foreground bg-muted/40 prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{agreementText}</ReactMarkdown>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Закрыть
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);


const PartnerAgreement = ({ onAgree }: { onAgree: () => void }) => {
    const [agreed, setAgreed] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleAgree = () => {
        startTransition(() => {
            onAgree();
        });
    };

    return (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, ease: 'easeOut' }}>
            <Card className="max-w-3xl mx-auto border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle>Партнерское соглашение</CardTitle>
                    <CardDescription>Чтобы получить доступ к кабинету партнера и начать зарабатывать, примите условия партнерства.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-48 overflow-y-auto border rounded-md p-4 text-sm text-muted-foreground bg-muted/50 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{agreementText}</ReactMarkdown>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} />
                        <Label htmlFor="terms" className="cursor-pointer">Я прочитал(а) и полностью согласен(на) с условиями Партнерского соглашения.</Label>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAgree} disabled={!agreed || isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Стать партнером
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const levels = [
  {
    name: 'Bronze',
    icon: Star,
    title: 'Бронзовый партнер',
    reward: '100% от первого платежа',
    condition: 'Присваивается автоматически',
    color: 'text-amber-600 border-amber-400',
  },
  {
    name: 'Silver',
    icon: Trophy,
    title: 'Серебряный партнер',
    reward: '10% от всех платежей',
    condition: 'Пройти обучение',
    color: 'text-slate-500 border-slate-400',
  },
  {
    name: 'Gold',
    icon: Crown,
    title: 'Золотой партнер',
    reward: '40% от всех платежей',
    condition: 'Заключить договор франшизы, паушальный взнос 500,000 руб.',
    color: 'text-yellow-500 border-yellow-400',
  },
  {
    name: 'Platinum',
    icon: Gem,
    title: 'Платиновый партнер',
    reward: '60% от всех платежей + White Label',
    condition: 'Заключить договор, взнос 1,000,000 руб.',
    color: 'text-sky-500 border-sky-400',
  },
];


const PartnerLevels = ({ currentStatus }: { currentStatus?: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const normalizedStatus = currentStatus || 'Bronze';
  const currentLevelIndex = levels.findIndex((level) => level.name === normalizedStatus);

  const handleOpenModal = (tier: 'Silver' | 'Gold' | 'Platinum') => {
      setSelectedTier(tier);
      setIsModalOpen(true);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Уровни партнерской программы</CardTitle>
          <CardDescription>Повышайте свой статус, чтобы увеличить вознаграждение.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {levels.map((level, index) => {
            const isCurrent = level.name === normalizedStatus;
            const isNextLevel = currentLevelIndex !== -1 && index === currentLevelIndex + 1;
            
            return (
              <motion.div
                key={level.name}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 + index * 0.05, ease: 'easeOut' }}
              >
                <Card className={cn("flex h-full flex-col transition-shadow", isCurrent && 'border-primary ring-2 ring-primary/50')}>
                  <CardHeader>
                    <CardTitle className={cn("flex items-center gap-2", level.color)}>
                      <level.icon className="h-5 w-5" />
                      {level.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm flex-grow">
                    <p className="font-semibold">{level.reward}</p>
                    <p className="text-muted-foreground">{level.condition}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                     {isCurrent && (
                        <Badge variant="secondary"><CheckCircle className="mr-2 h-4 w-4 text-success"/>Ваш текущий статус</Badge>
                      )}
                     {isNextLevel && (
                        <Button variant="outline" onClick={() => handleOpenModal(level.name as 'Silver' | 'Gold' | 'Platinum')}>
                          Запросить статус
                        </Button>
                     )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
       {selectedTier && (
            <HighTierPartnerDialog 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tier={selectedTier}
            />
        )}
    </>
  );
};


const ReferralDashboard = () => {
    const { user, toast } = useAppContext();
    const [referredUsers, setReferredUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isAgreementOpen, setIsAgreementOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchReferredUsers = async () => {
            setIsLoading(true);
            try {
                const users = await getReferredUsers(user.uid);
                setReferredUsers(users);
            } catch (error: any) {
                console.warn("Could not fetch referred users. This might be due to a missing index which is being created now.", error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReferredUsers();
    }, [user]);

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const referralLink = user?.uid ? `${siteUrl}/auth/register?ref=${user.uid}` : '';
    const promocode = user?.uid || '';

    const handleCopy = (textToCopy: string, successMessage: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Скопировано!",
            description: successMessage,
        });
    };
    
    const totalReferrals = referredUsers.length;
    const totalEarnedCredits = referredUsers.filter(u => u.status === 'active').length * promoConfig.referralProgram.referrerBonus.credits;
    const partnerStatus = user?.partnerStatus || 'Bronze';
    const partnerStatusMeta = levels.find((level) => level.name === partnerStatus);
    const partnerTermsDate = formatShortDate(user?.partnerTermsAgreedAt);
    const termsDate = formatShortDate(user?.termsAgreedAt);

    return (
        <>
        <RegistrationDialog 
            isOpen={isRegisterOpen} 
            onClose={() => setIsRegisterOpen(false)}
            initialPromoCode={user?.uid}
        />
        <AgreementPreviewDialog open={isAgreementOpen} onOpenChange={setIsAgreementOpen} />
        <div className="space-y-6">
             <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, ease: 'easeOut' }}>
                <Card className="relative overflow-hidden border-border/60">
                    <CardHeader>
                        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-primary" />
                                Кабинет партнера
                            </span>
                            <Badge variant="outline" className={cn("text-base", partnerStatusMeta?.color)}>
                                {partnerStatusMeta ? partnerStatusMeta.title : partnerStatus}
                            </Badge>
                        </CardTitle>
                        <CardDescription>Отслеживайте свой прогресс, управляйте заявками и рефералами.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border bg-background/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Статус аккаунта</p>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant={user?.status === 'active' ? 'secondary' : 'destructive'}>
                                    {user?.status === 'active' ? 'Активен' : 'Заблокирован'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">Профиль пользователя</span>
                            </div>
                        </div>
                        <div className="rounded-lg border bg-background/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Соглашение</p>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary">
                                    <BadgeCheck className="mr-2 h-4 w-4 text-emerald-500" />
                                    Принято
                                </Badge>
                                <span className="text-sm text-muted-foreground">{partnerTermsDate || 'дата не указана'}</span>
                            </div>
                        </div>
                        <div className="rounded-lg border bg-background/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Следующий шаг</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Запросите следующий статус, чтобы увеличить вознаграждение и доступ к опциям.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Документы и согласия</CardTitle>
                        <CardDescription>Важные документы и текущее состояние согласий.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">Партнерское соглашение</p>
                                        <p className="text-xs text-muted-foreground">Актуальная редакция</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setIsAgreementOpen(true)}>
                                    Открыть
                                </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">Регламент выплат</p>
                                        <p className="text-xs text-muted-foreground">Скоро появится в кабинете</p>
                                    </div>
                                </div>
                                <Badge variant="secondary">В подготовке</Badge>
                            </div>
                        </div>
                        <div className="space-y-3 rounded-lg border bg-background p-4">
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                                <p className="text-sm font-medium">Согласия</p>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Основные условия сервиса</span>
                                <span className="font-medium">{termsDate || 'не указано'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Партнерское соглашение</span>
                                <span className="font-medium">{partnerTermsDate || 'не указано'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Маркетинговые материалы</span>
                                <Badge variant={user?.agreedToMarketing ? 'secondary' : 'outline'}>
                                    {user?.agreedToMarketing ? 'Подключено' : 'Не подключено'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Всего рефералов</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalReferrals}</div>
                            <p className="text-xs text-muted-foreground">пользователей пришло по вашей ссылке</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Заработано кредитов</CardTitle>
                            <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalEarnedCredits}</div>
                            <p className="text-xs text-muted-foreground">за все время</p>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
            
             <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}>
                <PartnerLevels currentStatus={user?.partnerStatus} />
            </motion.div>

            <Card>
                <CardHeader>
                    <CardTitle>Инструменты партнера</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Ваша реферальная ссылка</Label>
                        <div className="flex items-center gap-2">
                            <Input value={referralLink} readOnly />
                            <Button variant="outline" size="icon" onClick={() => handleCopy(referralLink, "Реферальная ссылка скопирована.")} disabled={!referralLink}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Ваш промокод</Label>
                        <div className="flex items-center gap-2">
                            <Input value={promocode} readOnly />
                            <Button variant="outline" size="icon" onClick={() => handleCopy(promocode, "Промокод скопирован.")} disabled={!promocode}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Пользователь может ввести этот код при регистрации, чтобы стать вашим рефералом.</p>
                    </div>
                </CardContent>
                 <CardFooter className="flex-wrap gap-2">
                    <Button asChild>
                         <a href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Привет! Зацени этого AI-бота для создания смет. Дают бонусы за регистрацию.")}`} target="_blank" rel="noopener noreferrer">
                             <Send className="mr-2 h-4 w-4"/> Поделиться в Telegram
                        </a>
                    </Button>
                    <Button variant="secondary" onClick={() => setIsRegisterOpen(true)}><UserPlus className="mr-2 h-4 w-4"/> Зарегистрировать вручную</Button>
                </CardFooter>
            </Card>

            <Card className="border-border/60">
                <CardHeader>
                    <CardTitle>Привлеченные пользователи</CardTitle>
                    <CardDescription>Список всех, кто зарегистрировался по вашей ссылке.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : referredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Пока никто не зарегистрировался по вашей ссылке.</p>
                    ) : (
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Пользователь</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Заработано</TableHead>
                                    <TableHead className="text-right">Дата регистрации</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {referredUsers.map(refUser => (
                                    <TableRow key={refUser.uid}>
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-3">
                                              <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={`https://avatar.vercel.sh/${refUser.email}.png`} alt={refUser.displayName || 'Avatar'} />
                                                <AvatarFallback>{refUser.displayName?.[0]}</AvatarFallback>
                                              </Avatar>
                                              <div className="grid gap-0.5">
                                                <p className="font-medium truncate">{refUser.displayName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{refUser.email}</p>
                                              </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={refUser.status === 'active' ? 'secondary' : 'destructive'} className={refUser.status === 'active' ? 'text-green-600 border-green-500' : ''}>
                                                {refUser.status === 'active' ? 'Активен' : 'Заблокирован'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-600">
                                            {refUser.status === 'active' ? `+${promoConfig.referralProgram.referrerBonus.credits} кредитов` : '0 кредитов'}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">{refUser.createdAt?.toDate ? format(refUser.createdAt.toDate(), 'dd.MM.yyyy', { locale: ru }) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        </>
    );
};

export default function BonusPage() {
    const { user, toast } = useAppContext();

    const handleAgree = async () => {
        if (!user) return;
        try {
            const result = await agreeToPartnerTerms({ userId: user.uid });
            if (result.success) {
                toast({ title: "Поздравляем!", description: "Вы официально стали партнером Montage HUB!" });
                // The user object will be updated by the onSnapshot listener in AppContext
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({ title: "Ошибка", description: error.message || "Не удалось стать партнером.", variant: "destructive" });
        }
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // If user is not yet a partner, show the agreement first.
    if (!user.isPartner) {
        return <PartnerAgreement onAgree={handleAgree} />;
    }
    
    // If user is a partner, show the full dashboard.
    return <ReferralDashboard />;
}


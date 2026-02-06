// src/components/RegistrationDialog.tsx
"use client";

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, AlertCircle, Info, HelpCircle, Gift } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from "framer-motion";
import promoConfig from '@/lib/promo-config.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


// --- ВНИМАНИЕ! СТРОГО ЗАПРЕЩЕНО МЕНЯТЬ, ПЕРЕМЕЩАТЬ ИЛИ УДАЛЯТЬ ЭТОТ ИМПОРТ ---
import modelsConfig from '@/lib/ai-config.json';
const { apiModels } = modelsConfig;
// --- КОНЕЦ ЗАЩИЩЕННОЙ ЗОНЫ ---

interface RegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPromoCode?: string;
}

export function RegistrationDialog({ isOpen, onClose, initialPromoCode }: RegistrationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [promoCode, setPromoCode] = useState(initialPromoCode || '');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [agreedToThirdParty, setAgreedToThirdParty] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [showPromoInput, setShowPromoInput] = useState(!!initialPromoCode);

  useEffect(() => {
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
      setShowPromoInput(true);
    }
  }, [initialPromoCode]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreedToTerms || !agreedToPrivacy) {
        setError("Необходимо принять условия пользовательского соглашения и политики обработки данных.");
        return;
    }
    startTransition(async () => {
      try {
        const defaultModel = apiModels.find((m:any) => m.isDefault) || apiModels[0];
        void defaultModel;

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            phone,
            promoCode,
            referralCode: initialPromoCode,
            agreedToMarketing,
            agreedToThirdParty,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error("Этот email уже зарегистрирован. Пожалуйста, войдите в свой аккаунт.");
          }
          const errorPayload = await response.json().catch(() => ({ message: 'Не удалось зарегистрироваться.' }));
          throw new Error(errorPayload.message || 'Не удалось зарегистрироваться.');
        }

        const loginResult = await signIn('credentials', { email, password, redirect: false });
        if (!loginResult || loginResult.error) {
          throw new Error('Регистрация прошла, но не удалось войти автоматически.');
        }

        toast({ title: "Регистрация прошла успешно!" });
        router.push('/dashboard');
        router.refresh();
        onClose();
      } catch (error: any) {
        setError(error.message);
      }
    });
  };
  
  const isSubmitDisabled = isPending || !agreedToTerms || !agreedToPrivacy;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                 <DialogTitle className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                  Создать аккаунт в AI Сметчик
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
                  Зарегистрируйтесь, чтобы начать работу.
                </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ошибка регистрации</AlertTitle>
                  <AlertDescription>
                      {error}
                      {error.includes("уже зарегистрирован") && (
                      <Button variant="link" asChild className="p-0 h-auto ml-1">
                         <Link href="/auth/login">Войти</Link>
                      </Button>
                      )}
                  </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <LabelInputContainer>
                    <Label htmlFor="register-email-modal">Email</Label>
                    <Input id="register-email-modal" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending}/>
                </LabelInputContainer>
                 <LabelInputContainer>
                    <Label htmlFor="register-phone-modal">Телефон</Label>
                    <Input id="register-phone-modal" type="tel" placeholder="+7 (999) 123-45-67" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPending}/>
                </LabelInputContainer>
                <LabelInputContainer>
                    <Label htmlFor="register-password-modal">Пароль (мин. 6 символов)</Label>
                    <Input id="register-password-modal" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isPending}/>
                </LabelInputContainer>
                
                 <AnimatePresence>
                {showPromoInput ? (
                    <motion.div
                        key="promo-input"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <LabelInputContainer className="mb-4">
                            <Label htmlFor="promo-code-modal">Промокод</Label>
                            <Input
                                id="promo-code-modal"
                                type="text"
                                placeholder="Введите промокод"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                disabled={isPending || !!initialPromoCode}
                            />
                        </LabelInputContainer>
                         {initialPromoCode && (
                            <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
                                <Gift className="h-4 w-4 text-green-600"/>
                                <AlertTitle className="text-green-800">Бонус от друга!</AlertTitle>
                                <AlertDescription className="text-green-700">
                                   Вам будет открыт доступ к PRO на {promoConfig.referralProgram.refereeBonus.proTrialDays} дней.
                                </AlertDescription>
                            </Alert>
                        )}
                    </motion.div>
                ) : (
                     <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => setShowPromoInput(true)}
                    >
                        У меня есть промокод
                    </Button>
                )}
                </AnimatePresence>

                <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                        <Checkbox id="privacy-modal" checked={agreedToPrivacy} onCheckedChange={(checked) => setAgreedToPrivacy(!!checked)} />
                        <Label htmlFor="privacy-modal" className="text-xs text-muted-foreground leading-snug">
                            Я согласен с <Link href="/legal/privacy-policy" target="_blank" className="underline hover:text-primary">Политикой обработки персональных данных</Link>.*
                        </Label>
                    </div>
                     <div className="flex items-start space-x-2">
                        <Checkbox id="terms-modal" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(!!checked)} />
                        <Label htmlFor="terms-modal" className="text-xs text-muted-foreground leading-snug">
                           Я даю <Link href="/legal/consent" target="_blank" className="underline hover:text-primary">согласие на обработку моих персональных данных</Link>.*
                        </Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="marketing-modal" checked={agreedToMarketing} onCheckedChange={(checked) => setAgreedToMarketing(!!checked)} />
                        <Label htmlFor="marketing-modal" className="text-xs text-muted-foreground leading-snug flex items-center">
                           Согласен на получение рекламных и информационных рассылок.
                           <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircle className="h-5 w-5 ml-1.5 cursor-help p-0.5"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Это согласие необходимо для получения<br/> 10 бесплатных кредитов каждый месяц.</p>
                                </TooltipContent>
                            </Tooltip>
                           </TooltipProvider>
                        </Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="third-party-modal" checked={agreedToThirdParty} onCheckedChange={(checked) => setAgreedToThirdParty(!!checked)} />
                        <Label htmlFor="third-party-modal" className="text-xs text-muted-foreground leading-snug flex items-center">
                           Согласен на передачу данных третьим лицам (платежным системам, курьерским службам, колл-центрам).
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-5 w-5 ml-1.5 cursor-help p-0.5"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Необходимо для обработки онлайн-платежей<br/> при покупке кредитов.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                    </div>
                </div>
                 <DialogFooter className="pt-4">
                    <Button variant="ghost" type="button" onClick={onClose}>Отмена</Button>
                    <button
                      className="group/btn relative inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-br from-black to-neutral-600 px-4 py-2 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
                      type="submit"
                      disabled={isSubmitDisabled}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Зарегистрироваться
                        <BottomGradient />
                    </button>
                </DialogFooter>
            </form>
             <div className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-300">
                Уже есть аккаунт?{' '}
                 <Link href="/auth/login" className="text-primary hover:underline">
                    Войти
                </Link>
            </div>
        </DialogContent>
    </Dialog>
  );
}

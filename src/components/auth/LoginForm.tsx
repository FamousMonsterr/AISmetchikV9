"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordReset } from '@/actions/userActions';
import { useAppContext } from '@/contexts/AppContext';
import { Logo } from '@/components/Logo';
import { PasskeyPanel } from '@/components/auth/PasskeyPanel';
import { TelegramAuthWidget } from '@/components/auth/TelegramAuthWidget';
import { resolvePostAuthRedirectUrl } from '@/lib/navigation';
import { isLikelyEmail } from '@/lib/auth-identifiers';

type LoginFormProps = {
  vkAuthEnabled: boolean;
  telegramMiniAppAuthEnabled: boolean;
  telegramWebAuthEnabled: boolean;
  telegramBotUsername: string;
};

export function LoginForm({
  vkAuthEnabled,
  telegramMiniAppAuthEnabled,
  telegramWebAuthEnabled,
  telegramBotUsername,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setNavigating } = useAppContext();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isProviderPending, startProviderTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const hasAutoStartedTelegramLogin = useRef(false);

  const finalizeSuccessfulLogin = async () => {
    const session = await getSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      throw new Error('Сессия не установлена после входа.');
    }

    const isFirstLogin = !localStorage.getItem(`hasLoggedIn_${sessionUserId}`);
    if (isFirstLogin) {
      localStorage.setItem(`hasLoggedIn_${sessionUserId}`, 'true');
      localStorage.setItem('showWelcomeModal', 'true');
      localStorage.setItem('showWelcomeToast', 'true');
    }

    toast({ title: 'Вход выполнен успешно.' });
    setNavigating(true);
    window.location.replace(resolvePostAuthRedirectUrl(session.user));
  };

  const handleCredentialsLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startLoginTransition(async () => {
      try {
        const result = await signIn('credentials', {
          identifier,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          if (result?.error === 'RESET_REQUIRED' && isLikelyEmail(identifier)) {
            await fetch('/api/auth/request-password-setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: identifier }),
            });
            setNavigating(true);
            router.push('/auth/set-password');
            return;
          }
          throw new Error('Неверный email/телефон или пароль.');
        }

        await finalizeSuccessfulLogin();
      } catch (loginError: any) {
        setError(loginError.message);
        toast({
          title: 'Ошибка входа',
          description: loginError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleVkLogin = () => {
    if (!vkAuthEnabled) {
      return;
    }

    setError(null);
    startProviderTransition(async () => {
      try {
        const result = await signIn('vk', {
          redirect: false,
          callbackUrl: '/auth/login?vk=1',
        });
        if (!result || result.error || !result.url) {
          throw new Error(result?.error || 'Не удалось начать вход через VK.');
        }
        setNavigating(true);
        window.location.assign(result.url);
      } catch (providerError: any) {
        setError(providerError.message);
        toast({
          title: 'VK вход недоступен',
          description: providerError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleTelegramMiniAppLogin = async () => {
    if (!telegramMiniAppAuthEnabled || !telegramInitData) {
      return;
    }

    setError(null);
    startProviderTransition(async () => {
      try {
        const result = await signIn('telegram-miniapp', {
          initData: telegramInitData,
          redirect: false,
        });
        if (!result || result.error) {
          throw new Error(result?.error || 'Не удалось войти через Telegram Mini App.');
        }
        await finalizeSuccessfulLogin();
      } catch (providerError: any) {
        setError(providerError.message);
        toast({
          title: 'Telegram вход недоступен',
          description: providerError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleTelegramWebLogin = async (payload: Record<string, unknown>) => {
    setError(null);
    startProviderTransition(async () => {
      try {
        const result = await signIn('telegram-web', {
          ...payload,
          redirect: false,
        });
        if (!result || result.error) {
          throw new Error(result?.error || 'Не удалось войти через Telegram.');
        }
        await finalizeSuccessfulLogin();
      } catch (providerError: any) {
        setError(providerError.message);
        toast({
          title: 'Telegram вход недоступен',
          description: providerError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handlePasswordReset = () => {
    if (!isLikelyEmail(identifier)) {
      toast({
        title: 'Нужен email',
        description: 'Для сброса пароля введите email, а не телефон.',
        variant: 'destructive',
      });
      return;
    }

    startResetTransition(async () => {
      const result = await sendPasswordReset({ email: identifier });
      toast({
        title: result.success ? 'Письмо отправлено' : 'Ошибка',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };

  useEffect(() => {
    const initData = (window as any)?.Telegram?.WebApp?.initData;
    if (typeof initData === 'string' && initData.trim()) {
      setTelegramInitData(initData.trim());
    }
  }, []);

  useEffect(() => {
    const providerCallback = searchParams.get('vk');
    if (providerCallback !== '1') {
      return;
    }

    let cancelled = false;
    void finalizeSuccessfulLogin().catch((callbackError: any) => {
      if (cancelled) {
        return;
      }
      setError(callbackError.message);
      toast({
        title: 'Не удалось завершить вход',
        description: callbackError.message,
        variant: 'destructive',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, toast]);

  useEffect(() => {
    if (hasAutoStartedTelegramLogin.current) {
      return;
    }
    if (!telegramMiniAppAuthEnabled || !telegramInitData) {
      return;
    }
    hasAutoStartedTelegramLogin.current = true;
    void handleTelegramMiniAppLogin();
  }, [telegramInitData, telegramMiniAppAuthEnabled]);

  const isBusy = isLoginPending || isProviderPending;
  const showTelegramWidget = telegramWebAuthEnabled && !!telegramBotUsername && !telegramInitData;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111b] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_80%_15%,_rgba(34,197,94,0.16),_transparent_24%),linear-gradient(180deg,#06101a_0%,#09131d_50%,#07111b_100%)]" />
      <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-center">
            <Logo href="/" className="px-0 text-slate-100" />
            <div className="mt-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Авторизация</p>
              <h1 className="text-4xl font-semibold leading-tight text-white">Вход в AI Сметчик</h1>
              <p className="text-sm leading-6 text-slate-300">
                Email или телефон, пароль и быстрые способы входа.
              </p>
            </div>
          </section>

          <div className="space-y-4">
            <Card className="border-white/10 bg-slate-950/70 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <Logo href="/" className="px-0 text-slate-100 lg:hidden" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl text-white">Вход</CardTitle>
                  <CardDescription className="text-slate-300">Введите данные для входа.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-50">
                    <AlertTitle>Ошибка</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form className="space-y-4" onSubmit={handleCredentialsLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-identifier" className="text-slate-200">
                      Email или телефон
                    </Label>
                    <Input
                      id="login-identifier"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="name@company.ru или +7 999 123-45-67"
                      autoComplete="username"
                      disabled={isBusy}
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-slate-200">
                      Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        disabled={isBusy}
                        className="border-white/10 bg-white/5 pr-12 text-white placeholder:text-slate-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-300 hover:text-white"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isBusy}>
                    {isLoginPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Войти
                  </Button>
                </form>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowPasskey((prev) => !prev)} disabled={isBusy}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Ключ доступа
                    </Button>
                    {vkAuthEnabled && (
                      <Button type="button" variant="outline" onClick={handleVkLogin} disabled={isBusy}>
                        {isProviderPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        VK
                      </Button>
                    )}
                  </div>

                  {showTelegramWidget && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <TelegramAuthWidget
                        botUsername={telegramBotUsername}
                        onAuth={handleTelegramWebLogin}
                        size="large"
                        requestWriteAccess
                      />
                    </div>
                  )}
                </div>

                {showPasskey && (
                  <PasskeyPanel
                    mode="authentication"
                    title="Ключ доступа"
                    showManagement={false}
                    onAuthenticationSuccess={finalizeSuccessfulLogin}
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                  <Button type="button" variant="link" className="px-0 text-slate-300" onClick={handlePasswordReset} disabled={isResetPending}>
                    {isResetPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Сбросить пароль
                  </Button>
                  <Link href="/auth/register" className="text-slate-100 underline underline-offset-4">
                    Создать аккаунт
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { Chrome, Eye, EyeOff, Loader2, LogIn, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
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
import { resolvePostAuthRedirectUrl } from '@/lib/navigation';

type LoginFormProps = {
  googleAuthEnabled: boolean;
  telegramMiniAppAuthEnabled: boolean;
};

export function LoginForm({ googleAuthEnabled, telegramMiniAppAuthEnabled }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setNavigating } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isTelegramPending, setIsTelegramPending] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasAutoStartedTelegramLogin = useRef(false);

  const finalizeSuccessfulLogin = async () => {
    const session = await getSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      throw new Error('Сессия не установлена после входа. Проверьте NEXTAUTH_URL/AUTH_TRUST_HOST и HTTPS (TLS).');
    }

    const isFirstLogin = !localStorage.getItem(`hasLoggedIn_${sessionUserId}`);
    if (isFirstLogin) {
      localStorage.setItem(`hasLoggedIn_${sessionUserId}`, 'true');
      localStorage.setItem('showWelcomeModal', 'true');
      localStorage.setItem('showWelcomeToast', 'true');
    }

    toast({ title: 'Вход выполнен успешно!' });
    setNavigating(true);
    window.location.replace(resolvePostAuthRedirectUrl(session.user));
  };

  const handleCredentialsLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startLoginTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          if (result?.error === 'RESET_REQUIRED') {
            await fetch('/api/auth/request-password-setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            setNavigating(true);
            router.push('/auth/set-password');
            return;
          }
          throw new Error('Неверный email или пароль. Проверьте данные или зарегистрируйтесь.');
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

  const handleGoogleLogin = async () => {
    if (!googleAuthEnabled || isGooglePending) {
      return;
    }

    setError(null);
    setIsGooglePending(true);

    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/auth/login?google=1',
      });

      if (!result) {
        throw new Error('Не удалось начать вход через Google.');
      }
      if (result.error) {
        throw new Error('Не удалось войти через Google. Проверьте OAuth настройки.');
      }
      if (!result.url) {
        throw new Error('Google OAuth не вернул URL перенаправления.');
      }

      setNavigating(true);
      window.location.assign(result.url);
    } catch (googleError: any) {
      setIsGooglePending(false);
      setError(googleError.message);
      toast({
        title: 'Google вход недоступен',
        description: googleError.message,
        variant: 'destructive',
      });
    }
  };

  const handleTelegramLogin = async () => {
    if (!telegramMiniAppAuthEnabled || isTelegramPending || !telegramInitData) {
      return;
    }

    setError(null);
    setIsTelegramPending(true);

    try {
      const result = await signIn('telegram', {
        initData: telegramInitData,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error(result?.error || 'Не удалось войти через Telegram Mini App.');
      }

      await finalizeSuccessfulLogin();
    } catch (telegramError: any) {
      setError(telegramError.message);
      setIsTelegramPending(false);
      toast({
        title: 'Telegram вход недоступен',
        description: telegramError.message,
        variant: 'destructive',
      });
    }
  };

  const handlePasswordReset = () => {
    if (!email) {
      toast({ title: 'Ошибка', description: 'Пожалуйста, введите email для сброса пароля.', variant: 'destructive' });
      return;
    }
    startResetTransition(async () => {
      const result = await sendPasswordReset({ email });
      if (result.success) {
        toast({ title: 'Успех', description: result.message });
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  useEffect(() => {
    const initData = (window as any)?.Telegram?.WebApp?.initData;
    if (typeof initData === 'string' && initData.trim()) {
      setTelegramInitData(initData.trim());
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('google') !== '1') {
      return;
    }

    let cancelled = false;
    setIsGooglePending(true);

    void finalizeSuccessfulLogin().catch((callbackError: any) => {
      if (cancelled) {
        return;
      }
      setIsGooglePending(false);
      setError(callbackError.message);
      toast({
        title: 'Не удалось завершить вход через Google',
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
    void handleTelegramLogin();
  }, [telegramMiniAppAuthEnabled, telegramInitData]);

  const telegramLoginAvailable = telegramMiniAppAuthEnabled && !!telegramInitData;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111b] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(56,189,248,0.18),_transparent_24%),linear-gradient(180deg,#06101a_0%,#09131d_50%,#07111b_100%)]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
            <div className="space-y-6">
              <Logo href="/" className="px-0 text-slate-100" />
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Авторизация</p>
                <h1 className="max-w-lg text-4xl font-semibold leading-tight text-white">
                  Один вход для смет, кабинета, CRM и автоматизации.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-300">
                  Credentials, Google OAuth и Telegram Mini App теперь проходят через один контур с единым{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.82em] text-slate-100">session.user.id</code>.
                  Если у аккаунта уже есть доступ, вход сохранит рабочие права и настройки.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-sm font-medium text-white">Единый identity</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Mongo-пользователь создаётся или обновляется автоматически.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-medium text-white">Graceful fallback</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Если OAuth не настроен, credentials остаются рабочими.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <LogIn className="h-5 w-5 text-blue-300" />
                <p className="mt-3 text-sm font-medium text-white">Быстрый вход</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Google, passkey и Mini App работают в одном auth-контуре.</p>
              </div>
            </div>
          </section>

          <Card className="relative overflow-hidden border-white/10 bg-slate-950/92 text-slate-100 shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Logo href="/" className="px-0 text-slate-100" />
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  {telegramLoginAvailable ? 'Telegram Mini App ready' : googleAuthEnabled ? 'Google OAuth ready' : 'Credentials only'}
                </span>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl text-white">Вход в AI Сметчик</CardTitle>
                <CardDescription className="text-slate-400">
                  Используйте email и пароль либо продолжите через Google.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {!googleAuthEnabled && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  Google OAuth отключен до тех пор, пока не будут заданы{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.82em] text-amber-50">GOOGLE_CLIENT_ID</code>{' '}
                  и{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.82em] text-amber-50">GOOGLE_CLIENT_SECRET</code>.
                </div>
              )}

              {error && (
                <Alert
                  variant="destructive"
                  className="border-rose-500/40 bg-rose-500/10 text-rose-100"
                >
                  <AlertTitle className="text-rose-50">Ошибка входа</AlertTitle>
                  <AlertDescription className="text-rose-100">{error}</AlertDescription>
                </Alert>
              )}

              {googleAuthEnabled && (
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoginPending || isGooglePending}
                  className="h-11 w-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  {isGooglePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                  Продолжить с Google
                </Button>
              )}

              {telegramLoginAvailable && (
                <Button
                  type="button"
                  onClick={handleTelegramLogin}
                  disabled={isLoginPending || isGooglePending || isTelegramPending}
                  className="h-11 w-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20"
                >
                  {isTelegramPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                  Продолжить через Telegram
                </Button>
              )}

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>или</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form className="space-y-4" onSubmit={handleCredentialsLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-200">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoginPending}
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-slate-200">Пароль</Label>
                    <button
                      type="button"
                      className="text-xs text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline"
                      onClick={handlePasswordReset}
                      disabled={isResetPending}
                    >
                      {isResetPending ? <Loader2 className="mr-2 inline-block h-3 w-3 animate-spin" /> : 'Забыли пароль?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoginPending}
                      className="border-white/10 bg-white/5 pr-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-100"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? 'Скрыть пароль' : 'Показать пароль'}</span>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  disabled={isLoginPending}
                >
                  {isLoginPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Войти
                </Button>
              </form>

              <div className="space-y-3 pt-2 text-center text-sm text-slate-400">
                <div>
                  Нет аккаунта?{' '}
                  <Link href="/auth/register" className="font-medium text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline">
                    Зарегистрироваться
                  </Link>
                </div>
              </div>

              <PasskeyPanel
                mode="authentication"
                title="Вход по passkey"
                description="Если passkey уже зарегистрирован для аккаунта, можно войти без пароля."
                showManagement={false}
                onAuthenticationSuccess={finalizeSuccessfulLogin}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

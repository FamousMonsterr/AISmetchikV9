// src/app/auth/login/page.tsx
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendPasswordReset } from '@/actions/userActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setNavigating } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginPending, startLoginTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [isResetPending, startResetTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
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
            throw new Error("Неверный email или пароль. Проверьте данные или зарегистрируйтесь.");
        }

        const session = await getSession();
        const sessionUserId = session?.user?.id;
        if (!sessionUserId) {
          throw new Error("Сессия не установлена после входа. Проверьте NEXTAUTH_URL/AUTH_TRUST_HOST и HTTPS (TLS).");
        }
        const userId = sessionUserId;
        
        // Check for first login
        const isFirstLogin = !localStorage.getItem(`hasLoggedIn_${userId}`);
        if (isFirstLogin) {
            localStorage.setItem(`hasLoggedIn_${userId}`, 'true');
            localStorage.setItem('showWelcomeModal', 'true');
            localStorage.setItem('showWelcomeToast', 'true'); // For the referral toast
        }

        toast({ title: "Вход выполнен успешно!" });
        setNavigating(true);
        router.replace('/dashboard');
        } catch (error: any) {
        setError(error.message);
        toast({
          title: "Ошибка входа",
          description: error.message,
          variant: "destructive",
        });
        }
    });
  };

  const handlePasswordReset = () => {
    if (!email) {
        toast({ title: "Ошибка", description: "Пожалуйста, введите email для сброса пароля.", variant: "destructive" });
        return;
    }
    startResetTransition(async () => {
      const result = await sendPasswordReset({ email: email });
      if (result.success) {
        toast({ title: "Успех", description: result.message });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                Вход в AI Сметчик
            </h2>
            <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
                Введите свои данные для входа в аккаунт.
            </p>

            {error && (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ошибка входа</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            )}

            <form className="my-8" onSubmit={handleLogin}>
                <LabelInputContainer className="mb-4">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoginPending}/>
                </LabelInputContainer>
                
                <LabelInputContainer className="mb-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Пароль</Label>
                    <button type="button" className="p-0 h-auto text-xs text-neutral-600 dark:text-neutral-300 hover:underline" onClick={handlePasswordReset} disabled={isResetPending}>
                        {isResetPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin inline-block"/> : "Забыли пароль?"}
                    </button>
                    </div>
                    <div className="relative">
                        <Input id="login-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoginPending}/>
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                           {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4" />}
                           <span className="sr-only">{showPassword ? 'Скрыть пароль' : 'Показать пароль'}</span>
                        </button>
                    </div>
                </LabelInputContainer>

                <button
                  className="group/btn relative block h-10 w-full rounded-md bg-primary font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={isLoginPending}
                >
                    {isLoginPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : <LogIn className="mr-2 h-4 w-4 inline-block" />}
                    Войти
                    <BottomGradient />
                </button>
                
                <div className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-300">
                    Нет аккаунта?{' '}
                    <Link href="/auth/register" className="text-primary hover:underline">
                        Зарегистрироваться
                    </Link>
                </div>
            </form>
        </div>
    </div>
  );
}

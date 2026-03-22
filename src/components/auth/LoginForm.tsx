"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import {
  Chrome,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordReset } from "@/actions/userActions";
import { useAppContext } from "@/contexts/AppContext";
import { resolvePostAuthRedirectUrl } from "@/lib/navigation";
import { CompactPasskeyAuth } from "@/components/auth/CompactPasskeyAuth";

type LoginFormProps = {
  googleAuthEnabled: boolean;
  appleAuthEnabled: boolean;
  telegramMiniAppAuthEnabled: boolean;
};

export function LoginForm({
  googleAuthEnabled,
  appleAuthEnabled,
  telegramMiniAppAuthEnabled,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setNavigating } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isApplePending, setIsApplePending] = useState(false);
  const [isTelegramPending, setIsTelegramPending] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasAutoStartedTelegramLogin = useRef(false);

  const finalizeSuccessfulLogin = async () => {
    const session = await getSession();
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      throw new Error("Не удалось открыть сессию после входа.");
    }

    const isFirstLogin = !window.localStorage.getItem(`hasLoggedIn_${sessionUserId}`);
    if (isFirstLogin) {
      window.localStorage.setItem(`hasLoggedIn_${sessionUserId}`, "true");
      window.localStorage.setItem("showWelcomeModal", "true");
      window.localStorage.setItem("showWelcomeToast", "true");
    }

    toast({ title: "Вход выполнен" });
    setNavigating(true);
    window.location.replace(resolvePostAuthRedirectUrl(session.user));
  };

  const handleCredentialsLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startLoginTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          if (result?.error === "RESET_REQUIRED") {
            await fetch("/api/auth/request-password-setup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            setNavigating(true);
            router.push("/auth/set-password");
            return;
          }

          throw new Error("Неверный email или пароль.");
        }

        await finalizeSuccessfulLogin();
      } catch (loginError: any) {
        setError(loginError.message);
        toast({
          title: "Ошибка входа",
          description: loginError.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    const setPending = provider === "google" ? setIsGooglePending : setIsApplePending;
    const enabled = provider === "google" ? googleAuthEnabled : appleAuthEnabled;
    const providerLabel = provider === "google" ? "Google" : "Apple";

    if (!enabled) {
      toast({
        title: `${providerLabel} пока недоступен`,
        description: "Подключите провайдер в настройках окружения и повторите вход.",
      });
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: "/auth/login?oauth=1",
      });

      if (!result || result.error || !result.url) {
        throw new Error(`Не удалось начать вход через ${providerLabel}.`);
      }

      setNavigating(true);
      window.location.assign(result.url);
    } catch (oauthError: any) {
      setPending(false);
      setError(oauthError.message);
      toast({
        title: `${providerLabel} недоступен`,
        description: oauthError.message,
        variant: "destructive",
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
      const result = await signIn("telegram", {
        initData: telegramInitData,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error(result?.error || "Не удалось войти через Telegram.");
      }

      await finalizeSuccessfulLogin();
    } catch (telegramError: any) {
      setError(telegramError.message);
      setIsTelegramPending(false);
      toast({
        title: "Telegram недоступен",
        description: telegramError.message,
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = () => {
    if (!email) {
      toast({
        title: "Нужен email",
        description: "Введите email, чтобы отправить ссылку для сброса пароля.",
        variant: "destructive",
      });
      return;
    }

    startResetTransition(async () => {
      const result = await sendPasswordReset({ email });
      toast({
        title: result.success ? "Письмо отправлено" : "Ошибка",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    });
  };

  useEffect(() => {
    const initData = (window as any)?.Telegram?.WebApp?.initData;
    if (typeof initData === "string" && initData.trim()) {
      setTelegramInitData(initData.trim());
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("oauth") !== "1" && searchParams.get("google") !== "1") {
      return;
    }

    let cancelled = false;
    setIsGooglePending(true);
    setIsApplePending(true);

    void finalizeSuccessfulLogin().catch((callbackError: any) => {
      if (cancelled) {
        return;
      }

      setIsGooglePending(false);
      setIsApplePending(false);
      setError(callbackError.message);
      toast({
        title: "Не удалось завершить вход",
        description: callbackError.message,
        variant: "destructive",
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
  }, [telegramInitData, telegramMiniAppAuthEnabled]);

  const socialBusy =
    isLoginPending || isGooglePending || isApplePending || isTelegramPending;

  return (
    <div className="min-h-screen bg-[#07111b] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="mb-8">
          <Logo href="/" className="px-0 text-slate-100" />
        </div>

        <div className="flex-1">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Войти</h1>
              <p className="text-sm text-slate-400">
                Google, Apple, Telegram, passkey или email.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-rose-500/40 bg-rose-500/10 text-rose-100"
                >
                  <AlertTitle className="text-rose-50">Ошибка входа</AlertTitle>
                  <AlertDescription className="text-rose-100">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => void handleOAuthLogin("google")}
                  disabled={socialBusy}
                  className="h-11 w-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  {isGooglePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Chrome className="mr-2 h-4 w-4" />
                  )}
                  Авторизоваться через Google
                </Button>

                <Button
                  type="button"
                  onClick={() => void handleOAuthLogin("apple")}
                  disabled={socialBusy}
                  className="h-11 w-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  {isApplePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Войти через Apple
                </Button>

                <Button
                  type="button"
                  onClick={handleTelegramLogin}
                  disabled={socialBusy || !telegramMiniAppAuthEnabled || !telegramInitData}
                  className="h-11 w-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20"
                >
                  {isTelegramPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  Войти через Telegram
                </Button>
              </div>

              <CompactPasskeyAuth onSuccess={finalizeSuccessfulLogin} />

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>или по email</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form className="space-y-4" onSubmit={handleCredentialsLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-200">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isLoginPending}
                    autoComplete="email"
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-slate-200">
                      Пароль
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline"
                      onClick={handlePasswordReset}
                      disabled={isResetPending}
                    >
                      {isResetPending ? (
                        <Loader2 className="mr-2 inline-block h-3 w-3 animate-spin" />
                      ) : (
                        "Забыли пароль?"
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isLoginPending}
                      autoComplete="current-password"
                      className="border-white/10 bg-white/5 pr-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-100"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Скрыть пароль" : "Показать пароль"}
                      </span>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  disabled={isLoginPending}
                >
                  {isLoginPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Войти по email
                </Button>
              </form>

              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-400">
                Если в профиле включена SMS-защита, после основного входа запросим код на
                привязанный номер.
              </div>

              <div className="text-center text-sm text-slate-400">
                Нет аккаунта?{" "}
                <Link
                  href="/auth/register"
                  className="font-medium text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
                >
                  Зарегистрироваться
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

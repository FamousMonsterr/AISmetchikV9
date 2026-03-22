"use client";

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Chrome, Loader2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { resolvePostAuthRedirectUrl } from "@/lib/navigation";
import promoConfig from "@/lib/promo-config.json";

// --- ВНИМАНИЕ! СТРОГО ЗАПРЕЩЕНО МЕНЯТЬ, ПЕРЕМЕЩАТЬ ИЛИ УДАЛЯТЬ ЭТОТ ИМПОРТ ---
import modelsConfig from "@/lib/ai-config.json";
const { apiModels } = modelsConfig;
// --- КОНЕЦ ЗАЩИЩЕННОЙ ЗОНЫ ---

type RegisterPageContentProps = {
  googleAuthEnabled: boolean;
};

function ConsentRow({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  label: ReactNode;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(!!value)} />
      <Label htmlFor={id} className="text-xs leading-6 text-slate-300">
        {label}
      </Label>
    </div>
  );
}

export function RegisterPageContent({ googleAuthEnabled }: RegisterPageContentProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setNavigating } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [agreedToThirdParty, setAgreedToThirdParty] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);

  const referralCode = searchParams.get("ref");

  const finalizeSuccessfulLogin = async () => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error("Не удалось открыть сессию после входа.");
    }

    toast({ title: "Регистрация завершена" });
    setNavigating(true);
    window.location.replace(resolvePostAuthRedirectUrl(session.user));
  };

  useEffect(() => {
    if (referralCode) {
      setPromoCode(referralCode);
      setShowPromoInput(true);
    }
  }, [referralCode]);

  useEffect(() => {
    if (searchParams.get("google") !== "1") {
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
        title: "Ошибка регистрации",
        description: callbackError.message,
        variant: "destructive",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, toast]);

  const handleGoogleRegister = async () => {
    if (!googleAuthEnabled || isGooglePending) {
      return;
    }

    setError(null);
    setIsGooglePending(true);

    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/auth/register?google=1",
      });

      if (!result || result.error || !result.url) {
        throw new Error("Не удалось продолжить через Google.");
      }

      setNavigating(true);
      window.location.assign(result.url);
    } catch (googleError: any) {
      setIsGooglePending(false);
      setError(googleError.message);
      toast({
        title: "Ошибка регистрации",
        description: googleError.message,
        variant: "destructive",
      });
    }
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!agreedToTerms || !agreedToPrivacy) {
      setError("Подтвердите обязательные документы.");
      return;
    }

    startTransition(async () => {
      try {
        // --- ВНИМАНИЕ! СТРОГО ЗАПРЕЩЕНО МЕНЯТЬ, ПЕРЕМЕЩАТЬ ИЛИ УДАЛЯТЬ ЭТО МЕСТО ---
        const defaultModel = apiModels.find((model: any) => model.isDefault) || apiModels[0];
        void defaultModel;
        // --- КОНЕЦ ЗАЩИЩЕННОЙ ЗОНЫ ---

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            phone,
            promoCode,
            referralCode,
            agreedToMarketing,
            agreedToThirdParty,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error("Этот email уже зарегистрирован.");
          }

          const errorPayload = await response
            .json()
            .catch(() => ({ message: "Не удалось зарегистрироваться." }));
          throw new Error(errorPayload.message || "Не удалось зарегистрироваться.");
        }

        const loginResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!loginResult || loginResult.error) {
          throw new Error("Аккаунт создан, но вход не выполнился автоматически.");
        }

        await finalizeSuccessfulLogin();
      } catch (registerError: any) {
        setError(registerError.message);
        toast({
          title: "Ошибка регистрации",
          description: registerError.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#07111b] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="mb-8">
          <Logo href="/" className="px-0 text-slate-100" />
        </div>

        <div className="flex-1">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Создать аккаунт</h1>
              <p className="text-sm text-slate-400">
                Быстрый старт по email или через Google.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-rose-500/40 bg-rose-500/10 text-rose-100"
                >
                  <AlertTitle className="text-rose-50">Ошибка регистрации</AlertTitle>
                  <AlertDescription className="text-rose-100">{error}</AlertDescription>
                </Alert>
              )}

              {googleAuthEnabled && (
                <Button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={isPending || isGooglePending}
                  className="h-11 w-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                >
                  {isGooglePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Chrome className="mr-2 h-4 w-4" />
                  )}
                  Продолжить с Google
                </Button>
              )}

              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-200">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isPending}
                    autoComplete="email"
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-phone" className="text-slate-200">
                    Телефон
                  </Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={isPending}
                    autoComplete="tel"
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-200">
                    Пароль
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isPending}
                    autoComplete="new-password"
                    className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                  />
                </div>

                <div className="space-y-3">
                  {showPromoInput ? (
                    <Input
                      id="promo-code"
                      type="text"
                      placeholder="Промокод"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      disabled={isPending || !!referralCode}
                      className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-400/70"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full justify-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 hover:bg-white/10 hover:text-white"
                      onClick={() => setShowPromoInput(true)}
                    >
                      У меня есть промокод
                    </Button>
                  )}

                  {referralCode && (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      По приглашению друга вы получите доступ к PRO на{" "}
                      {promoConfig.referralProgram.refereeBonus.proTrialDays} дней.
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <ConsentRow
                    id="privacy"
                    checked={agreedToPrivacy}
                    onCheckedChange={setAgreedToPrivacy}
                    label={
                      <>
                        Принимаю{" "}
                        <Link
                          href="/legal/privacy-policy"
                          target="_blank"
                          className="underline underline-offset-4 hover:text-white"
                        >
                          политику обработки персональных данных
                        </Link>
                        .
                      </>
                    }
                  />
                  <ConsentRow
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={setAgreedToTerms}
                    label={
                      <>
                        Даю{" "}
                        <Link
                          href="/legal/consent"
                          target="_blank"
                          className="underline underline-offset-4 hover:text-white"
                        >
                          согласие на обработку персональных данных
                        </Link>
                        .
                      </>
                    }
                  />
                  <ConsentRow
                    id="marketing"
                    checked={agreedToMarketing}
                    onCheckedChange={setAgreedToMarketing}
                    label="Согласен получать рассылки."
                  />
                  <ConsentRow
                    id="third-party"
                    checked={agreedToThirdParty}
                    onCheckedChange={setAgreedToThirdParty}
                    label="Согласен на передачу данных сервисным партнёрам."
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  disabled={isPending || !agreedToTerms || !agreedToPrivacy}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Зарегистрироваться
                </Button>
              </form>

              <div className="text-center text-sm text-slate-400">
                Уже есть аккаунт?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
                >
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

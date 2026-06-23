"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { resolvePostAuthRedirectUrl } from "@/lib/navigation";
import promoConfig from "@/lib/promo-config.json";

// --- ВНИМАНИЕ! СТРОГО ЗАПРЕЩЕНО МЕНЯТЬ, ПЕРЕМЕЩАТЬ ИЛИ УДАЛЯТЬ ЭТОТ ИМПОРТ ---
import modelsConfig from "@/lib/ai-config.json";
const { apiModels } = modelsConfig;
// --- КОНЕЦ ЗАЩИЩЕННОЙ ЗОНЫ ---

interface RegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPromoCode?: string;
}

export function RegistrationDialog({
  isOpen,
  onClose,
  initialPromoCode,
}: RegistrationDialogProps) {
  const { toast } = useToast();
  const { setNavigating } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState(initialPromoCode || "");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [agreedToThirdParty, setAgreedToThirdParty] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(!!initialPromoCode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
      setShowPromoInput(true);
    }
  }, [initialPromoCode]);

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
            referralCode: initialPromoCode,
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

        const loginResult = await signIn("credentials", { identifier: email, password, redirect: false });
        if (!loginResult || loginResult.error) {
          throw new Error("Аккаунт создан, но вход не выполнился автоматически.");
        }

        const session = await getSession();
        const sessionUserId = session?.user?.id;
        if (!sessionUserId) {
          throw new Error("Не удалось открыть сессию после входа.");
        }

        const isFirstLogin = !localStorage.getItem(`hasLoggedIn_${sessionUserId}`);
        if (isFirstLogin) {
          localStorage.setItem(`hasLoggedIn_${sessionUserId}`, "true");
          localStorage.setItem("showWelcomeModal", "true");
          localStorage.setItem("showWelcomeToast", "true");
        }

        toast({ title: "Регистрация завершена" });
        setNavigating(true);
        window.location.replace(resolvePostAuthRedirectUrl(session.user));
        onClose();
      } catch (registerError: any) {
        setError(registerError.message);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[min(92vh,720px)] max-w-md overflow-y-auto border-border bg-background p-4 text-foreground sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl text-foreground">Создать аккаунт</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive bg-destructive/10 text-destructive-foreground">
            <AlertTitle className="text-destructive-foreground">Ошибка регистрации</AlertTitle>
            <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleRegister}>
          <div className="space-y-2">
            <Label htmlFor="register-email-modal" className="text-foreground">
              Email
            </Label>
            <Input
              id="register-email-modal"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
              autoComplete="email"
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-phone-modal" className="text-foreground">
              Телефон
            </Label>
            <Input
              id="register-phone-modal"
              type="tel"
              placeholder="+7 (999) 123-45-67"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isPending}
              autoComplete="tel"
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password-modal" className="text-foreground">
              Пароль
            </Label>
            <Input
              id="register-password-modal"
              type="password"
              placeholder="Минимум 6 символов"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              autoComplete="new-password"
              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3">
            {showPromoInput ? (
              <Input
                id="promo-code-modal"
                type="text"
                placeholder="Промокод"
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
                disabled={isPending || !!initialPromoCode}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start rounded-2xl border border-border bg-muted/30 px-4 text-sm text-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowPromoInput(true)}
              >
                У меня есть промокод
              </Button>
            )}

            {initialPromoCode && (
              <div className="rounded-2xl border border-emerald-400/20 bg-primary/10 p-3 text-sm text-emerald-100">
                По приглашению друга вы получите доступ к PRO на{" "}
                {promoConfig.referralProgram.refereeBonus.proTrialDays} дней.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-3">
              <Checkbox
                id="privacy-modal"
                checked={agreedToPrivacy}
                onCheckedChange={(value) => setAgreedToPrivacy(!!value)}
              />
              <Label htmlFor="privacy-modal" className="text-xs leading-6 text-muted-foreground">
                Принимаю{" "}
                <Link
                  href="/legal/privacy-policy"
                  target="_blank"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  политику обработки персональных данных
                </Link>
                .
              </Label>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-3">
              <Checkbox
                id="terms-modal"
                checked={agreedToTerms}
                onCheckedChange={(value) => setAgreedToTerms(!!value)}
              />
              <Label htmlFor="terms-modal" className="text-xs leading-6 text-muted-foreground">
                Даю{" "}
                <Link
                  href="/legal/consent"
                  target="_blank"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  согласие на обработку персональных данных
                </Link>
                .
              </Label>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-3">
              <Checkbox
                id="marketing-modal"
                checked={agreedToMarketing}
                onCheckedChange={(value) => setAgreedToMarketing(!!value)}
              />
              <Label htmlFor="marketing-modal" className="text-xs leading-6 text-muted-foreground">
                Согласен получать рассылки.
              </Label>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-3">
              <Checkbox
                id="third-party-modal"
                checked={agreedToThirdParty}
                onCheckedChange={(value) => setAgreedToThirdParty(!!value)}
              />
              <Label htmlFor="third-party-modal" className="text-xs leading-6 text-muted-foreground">
                Согласен на передачу данных сервисным партнёрам.
              </Label>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button variant="ghost" type="button" onClick={onClose} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              disabled={isPending || !agreedToTerms || !agreedToPrivacy}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Зарегистрироваться
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

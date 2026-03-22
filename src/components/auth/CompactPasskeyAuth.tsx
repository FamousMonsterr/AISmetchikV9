"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2, QrCode, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  detectPasskeyCapabilities,
  isPasskeySupported,
  normalizeRequestOptions,
  parsePasskeyError,
  serializeAssertionCredential,
  type PasskeyCapabilities,
} from "@/lib/passkeys/browser";
import type {
  PasskeyAuthenticationOptionsResponse,
  PasskeyAuthenticationVerifyResponse,
} from "@/types/passkey";

type CompactPasskeyAuthProps = {
  onSuccess?: () => Promise<void> | void;
};

async function postJson<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }
  return payload as T;
}

export function CompactPasskeyAuth({ onSuccess }: CompactPasskeyAuthProps) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<PasskeyCapabilities>({
    supported: false,
    platformAuthenticatorAvailable: null,
    conditionalMediationAvailable: null,
  });
  const [isBusy, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void detectPasskeyCapabilities()
      .then((nextCapabilities) => {
        if (!cancelled) {
          setCapabilities(nextCapabilities);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCapabilities({
            supported: isPasskeySupported(),
            platformAuthenticatorAvailable: null,
            conditionalMediationAvailable: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticate = () => {
    setError(null);
    setStatus(null);

    startTransition(async () => {
      try {
        if (!capabilities.supported) {
          throw new Error("На этом устройстве ключи доступа не поддерживаются.");
        }

        const options = await postJson<PasskeyAuthenticationOptionsResponse>(
          "/api/auth/passkey/authenticate/options",
          { identifier: identifier.trim() || null },
        );

        const credential = (await navigator.credentials.get({
          publicKey: normalizeRequestOptions(options),
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error("Вход по ключу доступа отменён.");
        }

        const result = await postJson<PasskeyAuthenticationVerifyResponse>(
          "/api/auth/passkey/authenticate/verify",
          {
            challengeId: options.challengeId,
            credential: serializeAssertionCredential(credential),
          },
        );

        const signInResult = await signIn("passkey", {
          ticket: result.signInToken,
          redirect: false,
        });

        if (!signInResult || signInResult.error) {
          throw new Error("Ключ подтверждён, но сессия не открылась.");
        }

        setStatus("Ключ доступа подтверждён.");
        if (onSuccess) {
          await onSuccess();
        }
      } catch (authError: any) {
        setError(parsePasskeyError(authError));
      }
    });
  };

  const helperText =
    capabilities.platformAuthenticatorAvailable === true
      ? "Устройство предложит биометрию или системный менеджер ключей."
      : "Можно войти через телефон по QR или внешний ключ доступа.";

  return (
    <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <KeyRound className="h-4 w-4 text-emerald-300" />
          <span>Войти по ключу доступа</span>
        </div>
        <p className="text-sm leading-6 text-slate-400">{helperText}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/10 text-rose-100">
          <AlertTitle className="text-rose-50">Ошибка входа</AlertTitle>
          <AlertDescription className="text-rose-100">{error}</AlertDescription>
        </Alert>
      )}

      {status && (
        <Alert className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">
          <AlertTitle className="text-emerald-50">Готово</AlertTitle>
          <AlertDescription className="text-emerald-100">{status}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="passkey-login-email" className="text-slate-200">
          Email аккаунта
        </Label>
        <Input
          id="passkey-login-email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Можно оставить пустым"
          autoComplete="username webauthn"
          className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
          <Smartphone className="h-3.5 w-3.5 text-cyan-300" />
          <span>Это устройство</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
          <QrCode className="h-3.5 w-3.5 text-cyan-300" />
          <span>Телефон по QR</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleAuthenticate}
        disabled={isBusy || !capabilities.supported}
        className="h-11 w-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
      >
        {isBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        Войти по passkey
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  detectPasskeyCapabilities,
  isPasskeySupported,
  normalizeCreationOptions,
  normalizeRequestOptions,
  parsePasskeyError,
  serializeAssertionCredential,
  serializeCreationCredential,
  type PasskeyCapabilities,
} from '@/lib/passkeys/browser';
import type {
  PasskeyAuthenticationOptionsResponse,
  PasskeyAuthenticationVerifyResponse,
  PasskeyCredentialSummary,
  PasskeyRegistrationOptionsResponse,
} from '@/types/passkey';

type PasskeyPanelProps = {
  mode?: 'registration' | 'authentication' | 'both';
  title?: string;
  description?: string;
  showManagement?: boolean;
  onAuthenticationSuccess?: () => Promise<void> | void;
};

async function postJson<T>(url: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }
  return payload as T;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }
  return payload as T;
}

export function PasskeyPanel({
  mode = 'both',
  title = 'Ключ доступа',
  description = '',
  showManagement = true,
  onAuthenticationSuccess,
}: PasskeyPanelProps) {
  const [identifier, setIdentifier] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<PasskeyCredentialSummary[]>([]);
  const [capabilities, setCapabilities] = useState<PasskeyCapabilities>({
    supported: false,
    platformAuthenticatorAvailable: null,
    conditionalMediationAvailable: null,
  });
  const [isBusy, startTransition] = useTransition();
  const supported = capabilities.supported;

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

  const refreshCredentials = async () => {
    if (!showManagement) return;
    try {
      const payload = await getJson<{ credentials: PasskeyCredentialSummary[] }>(
        '/api/auth/passkey/credentials',
      );
      setCredentials(payload.credentials);
    } catch (refreshError: any) {
      if ((refreshError?.message || '').toLowerCase().includes('unauthorized')) {
        setCredentials([]);
        return;
      }
      setError(refreshError?.message || 'Не удалось загрузить список ключей доступа.');
    }
  };

  useEffect(() => {
    void refreshCredentials();
  }, []);

  const handleRegister = () => {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      try {
        if (!supported) {
          throw new Error('Это устройство не поддерживает WebAuthn и passkey.');
        }

        const options = await postJson<PasskeyRegistrationOptionsResponse>(
          '/api/auth/passkey/register/options',
          {
            nickname: nickname || null,
          },
        );

        const credential = (await navigator.credentials.create({
          publicKey: normalizeCreationOptions(options),
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error('Не удалось создать ключ доступа. Повторите попытку.');
        }

        const result = await postJson<{ ok: boolean; credential: { credentialId: string } }>(
          '/api/auth/passkey/register/verify',
          {
            challengeId: options.challengeId,
            nickname: nickname || null,
            credential: serializeCreationCredential(credential),
          },
        );

        setStatus('Ключ доступа подключён.');
        setNickname('');
        await refreshCredentials();
      } catch (registerError: any) {
        setError(parsePasskeyError(registerError));
      }
    });
  };

  const handleAuthenticate = () => {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      try {
        if (!supported) {
          throw new Error('Это устройство не поддерживает WebAuthn и passkey.');
        }

        const options = await postJson<PasskeyAuthenticationOptionsResponse>(
          '/api/auth/passkey/authenticate/options',
          {
            identifier: identifier.trim() || null,
          },
        );

        const credential = (await navigator.credentials.get({
          publicKey: normalizeRequestOptions(options),
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error('Не удалось получить ответ от ключа доступа.');
        }

        const result = await postJson<PasskeyAuthenticationVerifyResponse>(
          '/api/auth/passkey/authenticate/verify',
          {
            challengeId: options.challengeId,
            credential: serializeAssertionCredential(credential),
          },
        );

        const signInResult = await signIn('passkey', {
          ticket: result.signInToken,
          redirect: false,
        });

        if (!signInResult || signInResult.error) {
          throw new Error('Проверка прошла, но завершить вход не удалось.');
        }

        setStatus('Вход по ключу доступа выполнен.');
        if (onAuthenticationSuccess) {
          await onAuthenticationSuccess();
        }
      } catch (authError: any) {
        setError(parsePasskeyError(authError));
      }
    });
  };

  const handleDelete = (credentialId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await fetch(`/api/auth/passkey/credentials/${encodeURIComponent(credentialId)}`, {
          method: 'DELETE',
        }).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || 'Failed to delete passkey credential.');
          }
        });
        await refreshCredentials();
      } catch (deleteError: any) {
        setError(deleteError?.message || 'Не удалось удалить ключ доступа.');
      }
    });
  };

  return (
    <Card className="w-full border border-border/60 bg-background/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-5">
        {!supported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WebAuthn недоступен</AlertTitle>
            <AlertDescription>
              Используйте современный Chrome, Edge или Safari.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Готово</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {(mode === 'both' || mode === 'authentication') && (
          <div className="space-y-3 rounded-xl border border-dashed border-border/70 p-4">
            <div className="space-y-1">
              <Label htmlFor="passkey-identifier">Email</Label>
              <Input
                id="passkey-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Можно оставить пустым"
                autoComplete="username webauthn"
              />
            </div>
            <Button onClick={handleAuthenticate} disabled={isBusy || !supported} className="w-full">
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Войти по passkey
            </Button>
          </div>
        )}

        {(mode === 'both' || mode === 'registration') && (
          <div className="space-y-3 rounded-xl border border-dashed border-border/70 p-4">
            <div className="space-y-1">
              <Label htmlFor="passkey-nickname">Название</Label>
              <Input
                id="passkey-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Например, MacBook"
                autoComplete="off"
              />
            </div>
            <Button variant="outline" onClick={handleRegister} disabled={isBusy || !supported} className="w-full">
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Подключить passkey
            </Button>
          </div>
        )}

        {showManagement && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Сохранённые ключи</div>
              <Badge variant="secondary">{credentials.length}</Badge>
            </div>

            {credentials.length === 0 ? (
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                Ключи доступа ещё не подключены.
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map((credential) => (
                  <div
                    key={credential.credentialId}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">
                        {credential.nickname || credential.credentialId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {credential.createdAt}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(credential.credentialId)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

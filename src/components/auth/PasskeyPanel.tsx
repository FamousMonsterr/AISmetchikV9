"use client";

import { useEffect, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, KeyRound, Trash2, AlertCircle, Smartphone, LogIn } from 'lucide-react';
import {
  isPasskeySupported,
  parsePasskeyError,
  normalizeCreationOptions,
  normalizeRequestOptions,
  serializeAssertionCredential,
  serializeCreationCredential,
} from '@/lib/passkeys/browser';
import type {
  PasskeyAuthenticationVerifyResponse,
  PasskeyAuthenticationOptionsResponse,
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
  title = 'Passkey',
  description = 'Регистрация и вход без пароля через WebAuthn-пасски.',
  showManagement = true,
  onAuthenticationSuccess,
}: PasskeyPanelProps) {
  const [identifier, setIdentifier] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<PasskeyCredentialSummary[]>([]);
  const [isBusy, startTransition] = useTransition();
  const supported = isPasskeySupported();

  const refreshCredentials = async () => {
    if (!showManagement) return;
    try {
      const payload = await getJson<{ credentials: PasskeyCredentialSummary[] }>('/api/auth/passkey/credentials');
      setCredentials(payload.credentials);
    } catch (refreshError: any) {
      if ((refreshError?.message || '').toLowerCase().includes('unauthorized')) {
        setCredentials([]);
        return;
      }
      setError(refreshError?.message || 'Не удалось загрузить список passkey.');
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
          throw new Error('Этот браузер не поддерживает WebAuthn/passkey.');
        }

        const options = await postJson<PasskeyRegistrationOptionsResponse>('/api/auth/passkey/register/options', {
          nickname: nickname || null,
        });

        const credential = (await navigator.credentials.create({
          publicKey: normalizeCreationOptions(options),
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error('Passkey registration was cancelled.');
        }

        const result = await postJson<{ ok: boolean; credential: { credentialId: string } }>('/api/auth/passkey/register/verify', {
          challengeId: options.challengeId,
          nickname: nickname || null,
          credential: serializeCreationCredential(credential),
        });

        setStatus(`Passkey credential ${result.credential.credentialId} registered.`);
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
          throw new Error('Этот браузер не поддерживает WebAuthn/passkey.');
        }

        const options = await postJson<PasskeyAuthenticationOptionsResponse>('/api/auth/passkey/authenticate/options', {
          identifier: identifier || null,
        });

        const credential = (await navigator.credentials.get({
          publicKey: normalizeRequestOptions(options),
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error('Passkey sign-in was cancelled.');
        }

        const result = await postJson<PasskeyAuthenticationVerifyResponse>('/api/auth/passkey/authenticate/verify', {
          challengeId: options.challengeId,
          credential: serializeAssertionCredential(credential),
        });

        const signInResult = await signIn('passkey', {
          ticket: result.signInToken,
          redirect: false,
        });
        if (!signInResult || signInResult.error) {
          throw new Error('Passkey подтвержден, но не удалось открыть сессию.');
        }

        setStatus('Passkey вход подтвержден.');
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
          return payload;
        });
        await refreshCredentials();
      } catch (deleteError: any) {
        setError(deleteError?.message || 'Не удалось удалить passkey.');
      }
    });
  };

  return (
    <Card className="w-full border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!supported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WebAuthn недоступен</AlertTitle>
            <AlertDescription>Этот браузер не может создать или использовать passkey.</AlertDescription>
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
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Готово</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {(mode === 'both' || mode === 'authentication') && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="space-y-1">
              <Label htmlFor="passkey-identifier">Email или ID пользователя</Label>
              <Input
                id="passkey-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="user@company.ru"
                autoComplete="email"
              />
            </div>
            <Button onClick={handleAuthenticate} disabled={isBusy || !supported} className="w-full">
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Войти по passkey
            </Button>
          </div>
        )}

        {(mode === 'both' || mode === 'registration') && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="space-y-1">
              <Label htmlFor="passkey-nickname">Название passkey</Label>
              <Input
                id="passkey-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Основной ноутбук"
                autoComplete="off"
              />
            </div>
            <Button variant="outline" onClick={handleRegister} disabled={isBusy || !supported} className="w-full">
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Зарегистрировать passkey
            </Button>
          </div>
        )}

        {showManagement && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Список passkey</div>
              <Badge variant="secondary">{credentials.length}</Badge>
            </div>
            {credentials.length === 0 ? (
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                Пока нет сохранённых passkey.
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map((credential) => (
                  <div key={credential.credentialId} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">{credential.nickname || credential.credentialId}</div>
                      <div className="text-xs text-muted-foreground">
                        {credential.createdAt} · counter {credential.counter}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(credential.credentialId)} disabled={isBusy}>
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

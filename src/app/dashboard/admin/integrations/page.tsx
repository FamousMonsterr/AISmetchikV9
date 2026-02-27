"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getAppSettings, testConnectivity } from '@/actions/adminActions';

type ServiceHealth = {
  ok: boolean;
  message: string;
};

export default function AdminIntegrationsPage() {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [backendHealth, setBackendHealth] = useState<ServiceHealth | null>(null);
  const [frontendHealth, setFrontendHealth] = useState<ServiceHealth | null>(null);
  const [dbHealth, setDbHealth] = useState<ServiceHealth | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await getAppSettings();
        setSettings(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const runChecks = async () => {
    if (!user) return;
    setRunningChecks(true);
    try {
      const backendBaseUrl = settings?.backendBaseUrl?.replace(/\/$/, '');
      const frontendBaseUrl = settings?.frontendBaseUrl?.replace(/\/$/, '');

      if (backendBaseUrl) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/health`, { cache: 'no-store' });
          const json = await res.json().catch(() => ({}));
          setBackendHealth({
            ok: !!json?.ok && res.ok,
            message: res.ok ? `OK (${res.status})` : `HTTP ${res.status}`,
          });
        } catch (e: any) {
          setBackendHealth({ ok: false, message: e?.message || 'Backend health check failed' });
        }
      } else {
        setBackendHealth({ ok: false, message: 'backendBaseUrl не задан' });
      }

      if (frontendBaseUrl) {
        try {
          const res = await fetch(`${frontendBaseUrl}/api/health`, { cache: 'no-store' });
          const json = await res.json().catch(() => ({}));
          setFrontendHealth({
            ok: !!json?.ok && res.ok,
            message: res.ok ? `OK (${res.status})` : `HTTP ${res.status}`,
          });
        } catch (e: any) {
          setFrontendHealth({ ok: false, message: e?.message || 'Frontend health check failed' });
        }
      } else {
        setFrontendHealth({ ok: false, message: 'frontendBaseUrl не задан' });
      }

      const connectivity = await testConnectivity({ requesterId: user.uid, requireAdmin: true });
      setDbHealth({
        ok: !!connectivity?.status?.mongo?.ok,
        message: connectivity?.status?.mongo?.message || 'Mongo status unavailable',
      });
    } finally {
      setRunningChecks(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>Параметры связки frontend/backend и health-check перед релизом.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><span className="font-medium">Backend URL:</span> {settings?.backendBaseUrl || '—'}</div>
          <div><span className="font-medium">Frontend URL:</span> {settings?.frontendBaseUrl || '—'}</div>
          <div><span className="font-medium">Allowed Origins:</span> {(settings?.allowedFrontendOrigins || []).join(', ') || '—'}</div>
          <div><span className="font-medium">JWT Issuer:</span> {settings?.jwtIssuer || '—'}</div>
          <div><span className="font-medium">JWT Audience:</span> {settings?.jwtAudience || '—'}</div>
          <Button onClick={runChecks} disabled={runningChecks}>
            {runningChecks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Запустить health-check
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="font-medium">Backend:</span> {backendHealth ? `${backendHealth.ok ? 'OK' : 'FAIL'} — ${backendHealth.message}` : '—'}</div>
          <div><span className="font-medium">Frontend:</span> {frontendHealth ? `${frontendHealth.ok ? 'OK' : 'FAIL'} — ${frontendHealth.message}` : '—'}</div>
          <div><span className="font-medium">DB:</span> {dbHealth ? `${dbHealth.ok ? 'OK' : 'FAIL'} — ${dbHealth.message}` : '—'}</div>
        </CardContent>
      </Card>
    </div>
  );
}

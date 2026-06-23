'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Globe,
  Key,
  Plus,
  Trash2,
  Edit3,
  Star,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Server actions (xiaomi.ts has 'use server')
import {
  getXiaomiEndpoints,
  saveXiaomiEndpoint,
  deleteXiaomiEndpoint,
  getXiaomiKeyStats,
  addXiaomiKey,
  updateXiaomiKey,
  deactivateXiaomiKey,
  setPrimaryXiaomiKey,
  getXiaomiStats,
} from '@/services/xiaomi';

import type { XiaomiEndpoint, XiaomiApiKey } from '@/services/xiaomi';

// --- Helpers ---

function maskKey(key: string): string {
  if (key.length <= 12) return '***';
  return key.substring(0, 6) + '...' + key.substring(key.length - 4);
}

function newId(): string {
  return 'new-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

// --- Sub-components ---

function EndpointDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (ep: Omit<XiaomiEndpoint, 'createdAt'>) => void;
  initial?: XiaomiEndpoint | null;
}) {
  const [label, setLabel] = useState(initial?.label || '');
  const [endpoint, setEndpoint] = useState(initial?.endpoint || '');
  const [strategy, setStrategy] = useState<XiaomiEndpoint['rotationStrategy']>(
    initial?.rotationStrategy || 'round-robin'
  );

  useEffect(() => {
    if (open) {
      setLabel(initial?.label || '');
      setEndpoint(initial?.endpoint || '');
      setStrategy(initial?.rotationStrategy || 'round-robin');
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактировать эндпоинт' : 'Новый эндпоинт'}</DialogTitle>
          <DialogDescription>URL API Xiaomi MiMo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Singapore Main"
            />
          </div>
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://token-plan-sgp.xiaomimimo.com/v1"
            />
          </div>
          <div className="space-y-2">
            <Label>Стратегия ротации ключей</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Round Robin</SelectItem>
                <SelectItem value="least-used">Least Used</SelectItem>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="fallback">Fallback (min errors)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={() => {
              if (!endpoint.trim()) return;
              onSave({
                id: initial?.id || newId(),
                label: label || endpoint,
                endpoint: endpoint.trim(),
                rotationStrategy: strategy,
                isDefault: initial?.isDefault || false,
              });
            }}
          >
            {initial ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeyDialog({
  open,
  onClose,
  onSave,
  initial,
  endpoints,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (key: { label: string; key: string; endpoint: string; endpointId?: string }) => void;
  initial?: XiaomiApiKey | null;
  endpoints: XiaomiEndpoint[];
}) {
  const [label, setLabel] = useState(initial?.label || '');
  const [key, setKey] = useState(initial?.key || '');
  const [endpointId, setEndpointId] = useState(initial?.endpointId || '');
  const [customEndpoint, setCustomEndpoint] = useState(initial?.endpoint || '');

  useEffect(() => {
    if (open) {
      setLabel(initial?.label || '');
      setKey(initial?.key || '');
      setEndpointId(initial?.endpointId || '');
      setCustomEndpoint(initial?.endpoint || '');
    }
  }, [open, initial]);

  const selectedEndpoint = endpoints.find((e) => e.id === endpointId);
  const resolvedEndpoint = selectedEndpoint?.endpoint || customEndpoint;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактировать ключ' : 'Новый API ключ'}</DialogTitle>
          <DialogDescription>Ключ для доступа к Xiaomi MiMo API</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Production Key"
            />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label>Эндпоинт</Label>
            {endpoints.length > 0 ? (
              <Select
                value={endpointId || 'custom'}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setEndpointId('');
                  } else {
                    setEndpointId(v);
                    const ep = endpoints.find((e) => e.id === v);
                    if (ep) setCustomEndpoint(ep.endpoint);
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {endpoints.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>
                      {ep.label} — {ep.endpoint}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Свой URL...</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {(!endpoints.length || !endpointId) && (
              <Input
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="https://token-plan-sgp.xiaomimimo.com/v1"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={() => {
              if (!key.trim()) return;
              onSave({
                label: label || 'Key',
                key: key.trim(),
                endpoint: resolvedEndpoint,
                endpointId: endpointId || undefined,
              });
            }}
          >
            {initial ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Panel ---

export default function XiaomiProviderPanel() {
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<XiaomiEndpoint[]>([]);
  const [keys, setKeys] = useState<XiaomiApiKey[]>([]);
  const [stats, setStats] = useState<{
    byKey: Array<{ keyId: string; label: string; requests: number; tokens: number; errors: number; avgLatencyMs: number }>;
    byEndpoint: Array<{ endpoint: string; requests: number; tokens: number; errors: number; avgLatencyMs: number }>;
  }>({ byKey: [], byEndpoint: [] });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [endpointDialog, setEndpointDialog] = useState<{ open: boolean; edit?: XiaomiEndpoint | null }>({ open: false });
  const [keyDialog, setKeyDialog] = useState<{ open: boolean; edit?: XiaomiApiKey | null }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'endpoint' | 'key'; id: string; label: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eps, kys, st] = await Promise.all([
        getXiaomiEndpoints(),
        getXiaomiKeyStats(),
        getXiaomiStats(),
      ]);
      setEndpoints(eps);
      setKeys(kys);
      setStats(st);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: 'Ошибка загрузки: ' + (e.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Endpoint handlers ---

  const handleSaveEndpoint = (ep: Omit<XiaomiEndpoint, 'createdAt'>) => {
    startTransition(async () => {
      try {
        await saveXiaomiEndpoint(ep);
        toast({ title: 'Успешно', description: ep.id?.startsWith('new-') ? 'Эндпоинт добавлен' : 'Эндпоинт обновлён' });
        setEndpointDialog({ open: false });
        await loadAll();
      } catch (e: any) {
        toast({ title: 'Ошибка', description: String(e.message || e), variant: 'destructive' });
      }
    });
  };

  const handleDeleteEndpoint = (id: string) => {
    startTransition(async () => {
      try {
        await deleteXiaomiEndpoint(id);
        toast({ title: 'Успешно', description: 'Эндпоинт удалён' });
        setDeleteConfirm(null);
        await loadAll();
      } catch (e: any) {
        toast({ title: 'Ошибка', description: String(e.message || e), variant: 'destructive' });
      }
    });
  };

  // --- Key handlers ---

  const handleSaveKey = (data: { label: string; key: string; endpoint: string; endpointId?: string }) => {
    startTransition(async () => {
      try {
        if (keyDialog.edit) {
          await updateXiaomiKey(keyDialog.edit.id, {
            label: data.label,
            key: data.key,
            endpoint: data.endpoint,
            endpointId: data.endpointId,
          });
          toast({ title: 'Успешно', description: 'Ключ обновлён' });
        } else {
          await addXiaomiKey({
            id: newId(),
            label: data.label,
            key: data.key,
            endpoint: data.endpoint,
            endpointId: data.endpointId,
            isActive: true,
          });
          toast({ title: 'Успешно', description: 'Ключ добавлен' });
        }
        setKeyDialog({ open: false });
        await loadAll();
      } catch (e: any) {
        toast({ title: 'Ошибка', description: String(e.message || e), variant: 'destructive' });
      }
    });
  };

  const handleDeleteKey = (id: string) => {
    startTransition(async () => {
      try {
        await deactivateXiaomiKey(id);
        toast({ title: 'Успешно', description: 'Ключ деактивирован' });
        setDeleteConfirm(null);
        await loadAll();
      } catch (e: any) {
        toast({ title: 'Ошибка', description: String(e.message || e), variant: 'destructive' });
      }
    });
  };

  const handleSetPrimary = (id: string) => {
    startTransition(async () => {
      try {
        await setPrimaryXiaomiKey(id);
        toast({ title: 'Успешно', description: 'Основной ключ обновлён' });
        await loadAll();
      } catch (e: any) {
        toast({ title: 'Ошибка', description: String(e.message || e), variant: 'destructive' });
      }
    });
  };

  // --- Stats summary ---

  const totalRequests = stats.byKey.reduce((s, k) => s + k.requests, 0);
  const totalTokens = stats.byKey.reduce((s, k) => s + k.tokens, 0);
  const totalErrors = stats.byKey.reduce((s, k) => s + k.errors, 0);
  const avgLatency = stats.byKey.length > 0
    ? Math.round(stats.byKey.reduce((s, k) => s + k.avgLatencyMs, 0) / stats.byKey.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === Endpoints === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" /> Эндпоинты
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEndpointDialog({ open: true })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
          </Button>
        </div>

        {endpoints.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">
            Нет эндпоинтов. Добавьте URL для подключения к Xiaomi API.
          </p>
        ) : (
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ep.label}</span>
                    {ep.isDefault && (
                      <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{ep.rotationStrategy}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ep.endpoint}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEndpointDialog({ open: true, edit: ep })}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteConfirm({ type: 'endpoint', id: ep.id, label: ep.label })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* === API Keys === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4" /> API Ключи
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setKeyDialog({ open: true })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
          </Button>
        </div>

        {keys.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">
            Нет API ключей. Добавьте ключ для доступа к Xiaomi MiMo.
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Название</TableHead>
                  <TableHead>Ключ</TableHead>
                  <TableHead>Эндпоинт</TableHead>
                  <TableHead className="text-right">Запросы</TableHead>
                  <TableHead className="text-right">Ошибки</TableHead>
                  <TableHead className="text-right">Задержка</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const keyStat = stats.byKey.find((s) => s.keyId === k.id);
                  return (
                    <TableRow key={k.id} className={!k.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        {k.isPrimary ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <button
                            className="text-muted-foreground hover:text-yellow-500 transition-colors"
                            onClick={() => handleSetPrimary(k.id)}
                            title="Сделать основным"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {k.label}
                        {!k.isActive && (
                          <Badge variant="destructive" className="ml-2 text-xs">OFF</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {maskKey(k.key)}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {k.endpoint}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {keyStat?.requests ?? k.totalRequests}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {(keyStat?.errors ?? k.errorCount) > 0 ? (
                          <span className="text-destructive flex items-center justify-end gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {keyStat?.errors ?? k.errorCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {keyStat?.avgLatencyMs ?? 0}ms
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setKeyDialog({ open: true, edit: k })}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'key', id: k.id, label: k.label })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* === Stats === */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Статистика
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Запросы</p>
            <p className="text-lg font-bold">{totalRequests.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Токены</p>
            <p className="text-lg font-bold">{totalTokens.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Ошибки</p>
            <p className={`text-lg font-bold ${totalErrors > 0 ? 'text-destructive' : ''}`}>
              {totalErrors.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Ср. задержка</p>
            <p className="text-lg font-bold">{avgLatency}ms</p>
          </div>
        </div>

        {/* Per-endpoint stats */}
        {stats.byEndpoint.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">По эндпоинтам:</p>
            {stats.byEndpoint.map((es) => (
              <div
                key={es.endpoint}
                className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs"
              >
                <span className="truncate max-w-[300px]">{es.endpoint}</span>
                <div className="flex gap-4 text-muted-foreground">
                  <span>{es.requests} зап.</span>
                  <span>{es.tokens} ток.</span>
                  <span className={es.errors > 0 ? 'text-destructive' : ''}>{es.errors} ошиб.</span>
                  <span>{es.avgLatencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* === Dialogs === */}
      <EndpointDialog
        open={endpointDialog.open}
        onClose={() => setEndpointDialog({ open: false })}
        onSave={handleSaveEndpoint}
        initial={endpointDialog.edit}
      />

      <KeyDialog
        open={keyDialog.open}
        onClose={() => setKeyDialog({ open: false })}
        onSave={handleSaveKey}
        initial={keyDialog.edit}
        endpoints={endpoints}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердите удаление</DialogTitle>
            <DialogDescription>
              {deleteConfirm?.type === 'endpoint'
                ? `Эндпоинт «${deleteConfirm.label}» будет удалён. Ключи будут отвязаны.`
                : `Ключ «${deleteConfirm?.label}» будет деактивирован.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === 'endpoint') handleDeleteEndpoint(deleteConfirm.id);
                else handleDeleteKey(deleteConfirm.id);
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

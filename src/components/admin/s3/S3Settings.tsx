"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBucket,
  deleteBucket,
  deleteBucketCors,
  getBucketCors,
  listBuckets,
  putBucketCorsForTarget,
  testS3Connection,
  type EnvSettings,
} from "@/actions/adminActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Database, Eye, EyeOff, Loader2, RefreshCw, Server, Shield, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import S3TestBench from "./S3TestBench";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled: boolean;
};

function PasswordInput({ id, value, onChange, placeholder, disabled }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        onClick={() => setIsVisible((prev) => !prev)}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

type ProviderKind = "cloudru" | "beget" | "yandex" | "r2" | "custom";
type BucketRouteKey = "analysis" | "avatars" | "user_docs" | "project_docs";
type ResultState = {
  tone: "default" | "destructive";
  title: string;
  message: string;
};
type BucketResultMap = Partial<Record<BucketRouteKey, ResultState>>;

const PROVIDER_DEFAULTS: Record<Exclude<ProviderKind, "custom">, { endpoint: string; region: string }> = {
  cloudru: { endpoint: "https://s3.cloud.ru", region: "ru-central-1" },
  beget: { endpoint: "https://storage.beget.com", region: "ru-msk" },
  yandex: { endpoint: "https://storage.yandexcloud.net", region: "ru-central1" },
  r2: { endpoint: "", region: "auto" },
};

const BUCKET_ROUTES: Array<{
  key: BucketRouteKey;
  label: string;
  description: string;
  primaryPresetField: keyof EnvSettings;
  primaryBucketField: keyof EnvSettings;
  secondaryPresetField: keyof EnvSettings;
  secondaryBucketField: keyof EnvSettings;
  publicField: keyof EnvSettings;
  fallbackMode: "default" | "inherit-primary";
}> = [
  {
    key: "analysis",
    label: "Анализ",
    description: "Файлы первичного анализа, presigned upload и cache цепочка.",
    primaryPresetField: "s3ActivePresetId",
    primaryBucketField: "s3BucketName",
    secondaryPresetField: "s3AnalysisSecondaryPresetId",
    secondaryBucketField: "s3AnalysisSecondaryBucketName",
    publicField: "s3BucketIsPublic",
    fallbackMode: "default",
  },
  {
    key: "avatars",
    label: "Аватары",
    description: "Загрузка аватарок пользователей и прямой browser PUT через presigned URL.",
    primaryPresetField: "s3AvatarPresetId",
    primaryBucketField: "s3AvatarBucketName",
    secondaryPresetField: "s3AvatarSecondaryPresetId",
    secondaryBucketField: "s3AvatarSecondaryBucketName",
    publicField: "s3AvatarBucketIsPublic",
    fallbackMode: "inherit-primary",
  },
  {
    key: "user_docs",
    label: "Документы пользователя",
    description: "Подписи, печати, пользовательские документы и персональные вложения.",
    primaryPresetField: "s3UserDocsPresetId",
    primaryBucketField: "s3UserDocsBucketName",
    secondaryPresetField: "s3UserDocsSecondaryPresetId",
    secondaryBucketField: "s3UserDocsSecondaryBucketName",
    publicField: "s3UserDocsBucketIsPublic",
    fallbackMode: "inherit-primary",
  },
  {
    key: "project_docs",
    label: "Документы проекта",
    description: "КП, договоры, акты и остальные экспортируемые документы проекта.",
    primaryPresetField: "s3ProjectDocsPresetId",
    primaryBucketField: "s3ProjectDocsBucketName",
    secondaryPresetField: "s3ProjectDocsSecondaryPresetId",
    secondaryBucketField: "s3ProjectDocsSecondaryBucketName",
    publicField: "s3ProjectDocsBucketIsPublic",
    fallbackMode: "inherit-primary",
  },
];

function inferProviderFromEndpoint(endpoint?: string): ProviderKind {
  if (!endpoint) return "custom";
  if (endpoint.includes("cloud.ru")) return "cloudru";
  if (endpoint.includes("beget")) return "beget";
  if (endpoint.includes("yandexcloud")) return "yandex";
  if (endpoint.includes("r2.cloudflarestorage.com")) return "r2";
  return "custom";
}

function getRoutePrimaryPresetId(settings: EnvSettings, route: (typeof BUCKET_ROUTES)[number]) {
  const raw = settings[route.primaryPresetField];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (route.fallbackMode === "inherit-primary") return settings.s3ActivePresetId || "";
  return "";
}

function getRouteBucketName(settings: EnvSettings, field: keyof EnvSettings) {
  const value = settings[field];
  return typeof value === "string" ? value : "";
}

function buildCorsXml(origin: string, allowAllOrigins = false) {
  const safeOrigin = allowAllOrigins ? "*" : origin.trim() || "*";
  return `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>${safeOrigin}</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
  ${allowAllOrigins ? "" : `<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
  </CORSRule>`}
</CORSConfiguration>`;
}

function clearPresetRefs(settings: EnvSettings, presetId: string): EnvSettings {
  const next = { ...settings };

  if (next.s3ActivePresetId === presetId) next.s3ActivePresetId = "";
  if (next.s3SecondaryPresetId === presetId) next.s3SecondaryPresetId = "";
  if (next.s3AvatarPresetId === presetId) next.s3AvatarPresetId = "";
  if (next.s3AvatarSecondaryPresetId === presetId) next.s3AvatarSecondaryPresetId = "";
  if (next.s3UserDocsPresetId === presetId) next.s3UserDocsPresetId = "";
  if (next.s3UserDocsSecondaryPresetId === presetId) next.s3UserDocsSecondaryPresetId = "";
  if (next.s3ProjectDocsPresetId === presetId) next.s3ProjectDocsPresetId = "";
  if (next.s3ProjectDocsSecondaryPresetId === presetId) next.s3ProjectDocsSecondaryPresetId = "";
  if (next.s3AnalysisSecondaryPresetId === presetId) next.s3AnalysisSecondaryPresetId = "";

  return next;
}

export function S3Settings({
  settings,
  setSettings,
  isPending,
}: {
  settings: EnvSettings | null;
  setSettings: (settings: EnvSettings) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [activeBucket, setActiveBucket] = useState<BucketRouteKey>("analysis");
  const [providerResults, setProviderResults] = useState<ResultState | null>(null);
  const [bucketResults, setBucketResults] = useState<BucketResultMap>({});
  const [bucketCorsDrafts, setBucketCorsDrafts] = useState<Partial<Record<BucketRouteKey, string>>>({});
  const [bucketCreateNames, setBucketCreateNames] = useState<Partial<Record<BucketRouteKey, string>>>({});
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const presets = useMemo(() => settings?.s3Presets || [], [settings?.s3Presets]);
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  );

  useEffect(() => {
    if (!settings) return;
    if (selectedPresetId && presets.some((preset) => preset.id === selectedPresetId)) return;
    setSelectedPresetId(settings.s3ActivePresetId || presets[0]?.id || "");
  }, [presets, selectedPresetId, settings]);

  if (!settings) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setIsActionLoading(key);
      await action();
    } finally {
      setIsActionLoading(null);
    }
  };

  const setBucketResult = (routeKey: BucketRouteKey, tone: ResultState["tone"], title: string, message: string) => {
    setBucketResults((prev) => ({ ...prev, [routeKey]: { tone, title, message } }));
  };

  const ensureSelectedPreset = () => {
    if (!selectedPresetId) {
      throw new Error("Сначала выберите или создайте профиль провайдера.");
    }
    return selectedPresetId;
  };

  const updateSelectedPreset = (patch: Record<string, any>) => {
    if (!selectedPresetId) return;
    setSettings({
      ...settings,
      s3Presets: presets.map((preset) =>
        preset.id === selectedPresetId
          ? {
              ...preset,
              provider: patch.provider ?? preset.provider ?? inferProviderFromEndpoint(preset.config?.s3Endpoint),
              config: {
                ...preset.config,
                ...patch,
              },
            }
          : preset
      ),
    });
  };

  const createProviderPreset = (provider: ProviderKind) => {
    const defaults =
      provider === "custom"
        ? {}
        : {
            s3Endpoint: PROVIDER_DEFAULTS[provider].endpoint,
            s3Region: PROVIDER_DEFAULTS[provider].region,
          };
    const presetId = `s3-${nanoid(6)}`;
    const nextPreset = {
      id: presetId,
      name: `S3 ${provider} ${new Date().toLocaleDateString("ru-RU")}`,
      provider,
      config: {
        s3AccessKeyId: "",
        s3SecretAccessKey: "",
        s3Endpoint: defaults.s3Endpoint || "",
        s3Region: defaults.s3Region || "",
        s3BucketName: "",
        s3TenantId: provider === "cloudru" ? "" : undefined,
        s3BucketIsPublic: false,
        s3PresignedUrlExpiration: settings.s3PresignedUrlExpiration || 900,
      },
    };

    setSettings({
      ...settings,
      s3Presets: [...presets, nextPreset],
      s3ActivePresetId: settings.s3ActivePresetId || presetId,
    });
    setSelectedPresetId(presetId);
    setProviderResults({
      tone: "default",
      title: "Профиль создан",
      message: `Создан новый профиль провайдера ${provider}.`,
    });
  };

  const removeSelectedPreset = () => {
    if (!selectedPresetId) return;
    const nextSettings = clearPresetRefs(
      {
        ...settings,
        s3Presets: presets.filter((preset) => preset.id !== selectedPresetId),
      },
      selectedPresetId
    );
    setSettings(nextSettings);
    setSelectedPresetId(nextSettings.s3ActivePresetId || nextSettings.s3Presets?.[0]?.id || "");
    setProviderResults({
      tone: "default",
      title: "Профиль удалён",
      message: "Профиль провайдера удалён и отвязан от bucket routes.",
    });
  };

  const makeSelectedPresetDefault = () => {
    const presetId = ensureSelectedPreset();
    setSettings({
      ...settings,
      s3ActivePresetId: presetId,
    });
    setProviderResults({
      tone: "default",
      title: "Профиль по умолчанию обновлён",
      message: "Выбранный провайдер стал основным для analysis route.",
    });
  };

  const applyPresetToRoute = (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const presetId = ensureSelectedPreset();
    const next: EnvSettings = { ...settings };
    if (mode === "primary") {
      (next as any)[route.primaryPresetField] = presetId;
    } else {
      (next as any)[route.secondaryPresetField] = presetId;
    }
    setSettings(next);
    setBucketResult(route.key, "default", "Привязка обновлена", `Профиль ${selectedPreset?.name || presetId} назначен как ${mode === "primary" ? "основной" : "резервный"} для route ${route.label}.`);
  };

  const clearRoutePreset = (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const next: EnvSettings = { ...settings };
    (next as any)[mode === "primary" ? route.primaryPresetField : route.secondaryPresetField] = "";
    setSettings(next);
    setBucketResult(route.key, "default", "Привязка очищена", `Для route ${route.label} очищен ${mode === "primary" ? "основной" : "резервный"} preset.`);
  };

  const runProviderTest = async () => {
    const presetId = ensureSelectedPreset();
    await runAction("provider:test", async () => {
      const result = await testS3Connection(presetId);
      setProviderResults({
        tone: result.success ? "default" : "destructive",
        title: "Проверка подключения",
        message: result.message,
      });
    });
  };

  const loadProviderBuckets = async () => {
    const presetId = ensureSelectedPreset();
    await runAction("provider:buckets", async () => {
      const result = await listBuckets(presetId);
      setProviderResults({
        tone: result.success ? "default" : "destructive",
        title: "Список бакетов провайдера",
        message: result.success ? (result.buckets?.join(", ") || "Бакеты не найдены.") : result.message,
      });
    });
  };

  const getSelectedRouteTarget = (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const presetField = mode === "primary" ? route.primaryPresetField : route.secondaryPresetField;
    const bucketField = mode === "primary" ? route.primaryBucketField : route.secondaryBucketField;
    const presetId = String((settings as any)[presetField] || "");
    const bucketName = getRouteBucketName(settings, bucketField);
    return { presetId, bucketName };
  };

  const analyzeRoute = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    if (!target.presetId) {
      setBucketResult(route.key, "destructive", "Нет провайдера", `Для ${mode === "primary" ? "основного" : "резервного"} режима route ${route.label} не выбран preset.`);
      return;
    }
    if (!target.bucketName) {
      setBucketResult(route.key, "destructive", "Нет бакета", `Для route ${route.label} не задано имя бакета.`);
      return;
    }

    await runAction(`${route.key}:${mode}:analyze`, async () => {
      const [pingResult, bucketResult, corsResult] = await Promise.all([
        testS3Connection(target.presetId),
        listBuckets(target.presetId),
        getBucketCors({ presetId: target.presetId, bucketType: route.key, bucketName: target.bucketName }),
      ]);

      const parts = [
        `Ping: ${pingResult.message}`,
        `Buckets: ${bucketResult.success ? bucketResult.buckets?.join(", ") || "пусто" : bucketResult.message}`,
        `CORS: ${corsResult.success ? (corsResult.config ? "правила найдены" : "правила не заданы") : corsResult.message}`,
      ];

      if (corsResult.success && corsResult.config) {
        setBucketCorsDrafts((prev) => ({ ...prev, [route.key]: corsResult.config || "" }));
      }

      setBucketResult(route.key, pingResult.success && bucketResult.success && corsResult.success ? "default" : "destructive", `${route.label}: ${mode === "primary" ? "основной" : "резервный"} маршрут`, parts.join("\n"));
    });
  };

  const createRouteBucket = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    const desiredBucketName = (bucketCreateNames[route.key] || target.bucketName || "").trim();
    if (!target.presetId) {
      setBucketResult(route.key, "destructive", "Нет провайдера", "Выберите preset перед созданием бакета.");
      return;
    }
    if (!desiredBucketName) {
      setBucketResult(route.key, "destructive", "Нет имени бакета", "Укажите имя бакета для создания.");
      return;
    }

    await runAction(`${route.key}:${mode}:create`, async () => {
      const result = await createBucket({ presetId: target.presetId, bucketName: desiredBucketName });
      if (result.success) {
        const next: EnvSettings = { ...settings };
        (next as any)[mode === "primary" ? route.primaryBucketField : route.secondaryBucketField] = desiredBucketName;
        setSettings(next);
      }
      setBucketResult(route.key, result.success ? "default" : "destructive", "Создание бакета", result.message);
    });
  };

  const deleteRouteBucket = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    if (!target.presetId || !target.bucketName) {
      setBucketResult(route.key, "destructive", "Нет цели", "Для удаления бакета нужен preset и bucket name.");
      return;
    }
    await runAction(`${route.key}:${mode}:delete`, async () => {
      const result = await deleteBucket({ presetId: target.presetId, bucketName: target.bucketName });
      setBucketResult(route.key, result.success ? "default" : "destructive", "Удаление бакета", result.message);
    });
  };

  const loadRouteCors = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    if (!target.presetId || !target.bucketName) {
      setBucketResult(route.key, "destructive", "Нет цели", "Для чтения CORS нужен preset и bucket name.");
      return;
    }
    await runAction(`${route.key}:${mode}:cors:get`, async () => {
      const result = await getBucketCors({ presetId: target.presetId, bucketType: route.key, bucketName: target.bucketName });
      if (result.success) {
        setBucketCorsDrafts((prev) => ({ ...prev, [route.key]: result.config || "" }));
      }
      setBucketResult(route.key, result.success ? "default" : "destructive", "Чтение CORS", result.success ? (result.config || "CORS-правила не заданы.") : result.message);
    });
  };

  const applyRouteCors = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    const corsXml = bucketCorsDrafts[route.key] || "";
    if (!target.presetId || !target.bucketName) {
      setBucketResult(route.key, "destructive", "Нет цели", "Для записи CORS нужен preset и bucket name.");
      return;
    }
    if (!corsXml.trim()) {
      setBucketResult(route.key, "destructive", "Пустой CORS", "Сначала вставьте или сгенерируйте CORS XML.");
      return;
    }
    await runAction(`${route.key}:${mode}:cors:put`, async () => {
      const result = await putBucketCorsForTarget({
        corsXml,
        target: {
          presetId: target.presetId,
          bucketType: route.key,
          bucketName: target.bucketName,
        },
      });
      setBucketResult(route.key, result.success ? "default" : "destructive", "Применение CORS", result.message);
    });
  };

  const clearRouteCors = async (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const target = getSelectedRouteTarget(route, mode);
    if (!target.presetId || !target.bucketName) {
      setBucketResult(route.key, "destructive", "Нет цели", "Для удаления CORS нужен preset и bucket name.");
      return;
    }
    await runAction(`${route.key}:${mode}:cors:delete`, async () => {
      const result = await deleteBucketCors({
        presetId: target.presetId,
        bucketType: route.key,
        bucketName: target.bucketName,
      });
      if (result.success) {
        setBucketCorsDrafts((prev) => ({ ...prev, [route.key]: "" }));
      }
      setBucketResult(route.key, result.success ? "default" : "destructive", "Удаление CORS", result.message);
    });
  };

  const renderRouteCard = (route: (typeof BUCKET_ROUTES)[number], mode: "primary" | "secondary") => {
    const presetField = mode === "primary" ? route.primaryPresetField : route.secondaryPresetField;
    const bucketField = mode === "primary" ? route.primaryBucketField : route.secondaryBucketField;
    const presetId = String((settings as any)[presetField] || "");
    const bucketName = getRouteBucketName(settings, bucketField);
    const actionPrefix = `${route.key}:${mode}`;

    return (
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{mode === "primary" ? "Основной провайдер" : "Резервный провайдер"}</div>
            <p className="text-xs text-muted-foreground">
              {mode === "primary"
                ? "Используется в штатном пути route."
                : "Используется при падении primary preset для этого route."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => applyPresetToRoute(route, mode)} disabled={isPending || !selectedPresetId}>
              Подключить выбранный
            </Button>
            <Button size="sm" variant="ghost" onClick={() => clearRoutePreset(route, mode)} disabled={isPending || !presetId}>
              Отключить
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>{mode === "primary" ? "Preset" : "Fallback preset"}</Label>
            <Select
              value={presetId || "__none__"}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  [presetField]: value === "__none__" ? "" : value,
                } as EnvSettings)
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите профиль провайдера" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не назначен</SelectItem>
                {presets.map((preset) => (
                  <SelectItem key={`${route.key}-${mode}-${preset.id}`} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{mode === "primary" ? "Bucket name" : "Fallback bucket name"}</Label>
            <Input
              value={bucketName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  [bucketField]: e.target.value,
                } as EnvSettings)
              }
              placeholder={`${route.key}-bucket`}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => analyzeRoute(route, mode)} disabled={!!isActionLoading}>
            {isActionLoading === `${actionPrefix}:analyze` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Анализировать
          </Button>
          <Button size="sm" variant="outline" onClick={() => loadRouteCors(route, mode)} disabled={!!isActionLoading}>
            Получить CORS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setBucketCorsDrafts((prev) => ({
                ...prev,
                [route.key]: buildCorsXml(typeof window !== "undefined" ? window.location.origin : "https://montagehub.ru"),
              }))
            }
          >
            Рекомендованный CORS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setBucketCorsDrafts((prev) => ({
                ...prev,
                [route.key]: buildCorsXml("*", true),
              }))
            }
          >
            Открытый CORS
          </Button>
          <Button size="sm" onClick={() => applyRouteCors(route, mode)} disabled={!!isActionLoading}>
            Применить CORS
          </Button>
          <Button size="sm" variant="outline" onClick={() => clearRouteCors(route, mode)} disabled={!!isActionLoading}>
            Очистить CORS
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <Input
            value={bucketCreateNames[route.key] || ""}
            onChange={(e) => setBucketCreateNames((prev) => ({ ...prev, [route.key]: e.target.value }))}
            placeholder="Новое имя бакета"
            disabled={isPending}
          />
          <Button variant="outline" onClick={() => createRouteBucket(route, mode)} disabled={!!isActionLoading}>
            Создать бакет
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={() => deleteRouteBucket(route, mode)} disabled={!!isActionLoading || !bucketName}>
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить бакет
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            S3 Dashboard
          </CardTitle>
          <CardDescription>
            Одна каноническая страница управления S3: каталог провайдеров, bucket routes, primary/backup mapping, CORS и результаты диагностических запросов.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">S3 storage</div>
              <p className="text-sm text-muted-foreground">Главный переключатель для presigned upload, refresh-url и документных бакетов.</p>
            </div>
            <Switch
              checked={!!settings.s3StorageEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, s3StorageEnabled: checked })}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Каталог провайдеров</div>
                  <p className="text-xs text-muted-foreground">Один профиль = один endpoint + credentials + дефолтный bucket шаблона.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => createProviderPreset("cloudru")} disabled={isPending}>
                    Cloud.ru
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createProviderPreset("beget")} disabled={isPending}>
                    Beget
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createProviderPreset("yandex")} disabled={isPending}>
                    Yandex
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createProviderPreset("r2")} disabled={isPending}>
                    R2
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createProviderPreset("custom")} disabled={isPending}>
                    Custom
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Выбранный профиль</Label>
                <Select value={selectedPresetId || "__none__"} onValueChange={(value) => setSelectedPresetId(value === "__none__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите профиль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Профиль не выбран</SelectItem>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {presets.map((preset) => {
                  const provider = (preset.provider || inferProviderFromEndpoint(preset.config?.s3Endpoint)) as ProviderKind;
                  const isDefault = settings.s3ActivePresetId === preset.id;
                  const isSelected = selectedPresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "hover:border-primary/40"
                      )}
                      onClick={() => setSelectedPresetId(preset.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{preset.name}</div>
                        <div className="flex gap-1">
                          <Badge variant="outline">{provider}</Badge>
                          {isDefault ? <Badge>default</Badge> : null}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div>{preset.config?.s3Endpoint || "endpoint не задан"}</div>
                        <div>bucket: {preset.config?.s3BucketName || "—"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {providerResults ? (
                <Alert variant={providerResults.tone}>
                  <AlertTitle>{providerResults.title}</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">{providerResults.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <div className="font-medium">Редактор профиля</div>
                <p className="text-xs text-muted-foreground">Редактирование, тестирование, переключение default и удаление выбранного preset.</p>
              </div>

              {!selectedPreset ? (
                <Alert>
                  <AlertTitle>Нет выбранного профиля</AlertTitle>
                  <AlertDescription>Создайте или выберите preset, чтобы редактировать провайдера.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Имя профиля</Label>
                    <Input
                      value={selectedPreset.name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          s3Presets: presets.map((preset) => (preset.id === selectedPreset.id ? { ...preset, name: e.target.value } : preset)),
                        })
                      }
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={(selectedPreset.provider || inferProviderFromEndpoint(selectedPreset.config?.s3Endpoint)) as ProviderKind}
                      onValueChange={(value) => {
                        const provider = value as ProviderKind;
                        updateSelectedPreset({
                          provider,
                          ...(provider !== "custom"
                            ? {
                                s3Endpoint: PROVIDER_DEFAULTS[provider as Exclude<ProviderKind, "custom">]?.endpoint || selectedPreset.config?.s3Endpoint,
                                s3Region: PROVIDER_DEFAULTS[provider as Exclude<ProviderKind, "custom">]?.region || selectedPreset.config?.s3Region,
                              }
                            : {}),
                        });
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloudru">Cloud.ru</SelectItem>
                        <SelectItem value="beget">Beget</SelectItem>
                        <SelectItem value="yandex">Yandex Cloud</SelectItem>
                        <SelectItem value="r2">Cloudflare R2</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Endpoint</Label>
                      <Input value={selectedPreset.config?.s3Endpoint || ""} onChange={(e) => updateSelectedPreset({ s3Endpoint: e.target.value })} disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Input value={selectedPreset.config?.s3Region || ""} onChange={(e) => updateSelectedPreset({ s3Region: e.target.value })} disabled={isPending} />
                    </div>

                    {(() => {
                      const currentProvider = (selectedPreset.provider || inferProviderFromEndpoint(selectedPreset.config?.s3Endpoint)) as ProviderKind;
                      if (currentProvider === "cloudru") {
                        return (
                          <>
                            <div className="space-y-2">
                              <Label>Tenant ID</Label>
                              <Input
                                value={selectedPreset.config?.s3TenantId || ""}
                                onChange={(e) => updateSelectedPreset({ s3TenantId: e.target.value })}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">ID тенанта из Cloud.ru → IAM</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Access Key ID</Label>
                              <Input
                                value={selectedPreset.config?.s3AccessKeyId || ""}
                                onChange={(e) => updateSelectedPreset({ s3AccessKeyId: e.target.value })}
                                placeholder="仅 access key ID (без tenant:)"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Статический ключ доступа. Tenant добавится автоматически.</p>
                            </div>
                          </>
                        );
                      }
                      if (currentProvider === "yandex") {
                        return (
                          <>
                            <div className="space-y-2">
                              <Label>Access Key ID (key_id)</Label>
                              <Input
                                value={selectedPreset.config?.s3AccessKeyId || ""}
                                onChange={(e) => updateSelectedPreset({ s3AccessKeyId: e.target.value })}
                                placeholder="ajeisdq..."
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Статический ключ из Yandex Cloud → IAM → Сервисные аккаунты</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Secret Access Key</Label>
                              <PasswordInput
                                id="selected-s3-secret"
                                value={selectedPreset.config?.s3SecretAccessKey || ""}
                                onChange={(e) => updateSelectedPreset({ s3SecretAccessKey: e.target.value })}
                                placeholder="••••••••••"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Секретная часть ключа. Показывается только при создании.</p>
                            </div>
                          </>
                        );
                      }
                      if (currentProvider === "beget") {
                        return (
                          <>
                            <div className="space-y-2">
                              <Label>Access Key ID</Label>
                              <Input
                                value={selectedPreset.config?.s3AccessKeyId || ""}
                                onChange={(e) => updateSelectedPreset({ s3AccessKeyId: e.target.value })}
                                placeholder="Логин S3-хостинга"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Из панели Beget → S3-хостинг → Доступы</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Secret Access Key</Label>
                              <PasswordInput
                                id="selected-s3-secret"
                                value={selectedPreset.config?.s3SecretAccessKey || ""}
                                onChange={(e) => updateSelectedPreset({ s3SecretAccessKey: e.target.value })}
                                placeholder="Пароль S3-хостинга"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Пароль из панели Beget → S3-хостинг</p>
                            </div>
                          </>
                        );
                      }
                      if (currentProvider === "r2") {
                        return (
                          <>
                            <div className="space-y-2">
                              <Label>Account ID</Label>
                              <Input
                                value={(() => {
                                  const ep = selectedPreset.config?.s3Endpoint || "";
                                  const m = ep.match(/^https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/);
                                  return m ? m[1] : "";
                                })()}
                                onChange={(e) => {
                                  const accountId = e.target.value.trim();
                                  updateSelectedPreset({
                                    s3Endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "",
                                    s3Region: "auto",
                                  });
                                }}
                                placeholder="18906fd7e8503e4b91c6406d97ad6c5d"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Cloudflare → R2 → Overview → Account ID</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Access Key ID</Label>
                              <Input
                                value={selectedPreset.config?.s3AccessKeyId || ""}
                                onChange={(e) => updateSelectedPreset({ s3AccessKeyId: e.target.value })}
                                placeholder="0ce8ab1121225af26ebd880284b1cff1"
                                disabled={isPending}
                              />
                              <p className="text-xs text-muted-foreground">Cloudflare → R2 → Manage R2 API Tokens → S3 Credentials</p>
                            </div>
                          </>
                        );
                      }
                      // custom
                      return (
                        <>
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <Input
                              value={selectedPreset.config?.s3AccessKeyId || ""}
                              onChange={(e) => updateSelectedPreset({ s3AccessKeyId: e.target.value })}
                              disabled={isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <PasswordInput
                              id="selected-s3-secret"
                              value={selectedPreset.config?.s3SecretAccessKey || ""}
                              onChange={(e) => updateSelectedPreset({ s3SecretAccessKey: e.target.value })}
                              placeholder="••••••••••"
                              disabled={isPending}
                            />
                          </div>
                        </>
                      );
                    })()}

                    <div className="space-y-2">
                      <Label>Default bucket in preset</Label>
                      <Input value={selectedPreset.config?.s3BucketName || ""} onChange={(e) => updateSelectedPreset({ s3BucketName: e.target.value })} disabled={isPending} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button onClick={runProviderTest} disabled={!!isActionLoading}>
                      {isActionLoading === "provider:test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Проверить
                    </Button>
                    <Button variant="outline" onClick={loadProviderBuckets} disabled={!!isActionLoading}>
                      Получить бакеты
                    </Button>
                    <Button variant="outline" onClick={makeSelectedPresetDefault} disabled={isPending}>
                      Сделать default
                    </Button>
                    <Button variant="outline" className="md:col-span-2" onClick={removeSelectedPreset} disabled={isPending}>
                      Удалить профиль
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4" />
                Общие параметры
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Старый global fallback оставлен для совместимости, но основной сценарий теперь route-based.</p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <Label>Global fallback preset</Label>
              <Select
                value={settings.s3SecondaryPresetId || "__none__"}
                onValueChange={(value) => setSettings({ ...settings, s3SecondaryPresetId: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не назначен</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={`global-secondary-${preset.id}`} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">Enable global fallback</div>
                <p className="text-xs text-muted-foreground">Используется только если для route не задан собственный резерв.</p>
              </div>
              <Switch
                checked={!!settings.s3SecondaryEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, s3SecondaryEnabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bucket Routes
          </CardTitle>
          <CardDescription>Каждый S3 bucket route управляется отдельно: provider, fallback, bucket name, CORS и результаты запроса.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={activeBucket} onValueChange={(value) => setActiveBucket(value as BucketRouteKey)}>
            <TabsList className="grid w-full grid-cols-4">
              {BUCKET_ROUTES.map((route) => (
                <TabsTrigger key={route.key} value={route.key}>
                  {route.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {BUCKET_ROUTES.map((route) => {
              const result = bucketResults[route.key];
              return (
                <TabsContent key={route.key} value={route.key} className="space-y-4 pt-4">
                  <div className="rounded-lg border p-4">
                    <div className="font-medium">{route.label}</div>
                    <p className="text-sm text-muted-foreground">{route.description}</p>
                    <div className="mt-4 flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="font-medium">Public access</div>
                        <p className="text-xs text-muted-foreground">Определяет тип access URL после загрузки файла в этот route.</p>
                      </div>
                      <Switch
                        checked={!!(settings as any)[route.publicField]}
                        onCheckedChange={(checked) => setSettings({ ...settings, [route.publicField]: checked } as EnvSettings)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {renderRouteCard(route, "primary")}
                    {renderRouteCard(route, "secondary")}
                  </div>

                  <div className="space-y-2">
                    <Label>CORS XML для route {route.label}</Label>
                    <Textarea
                      value={bucketCorsDrafts[route.key] || ""}
                      onChange={(e) => setBucketCorsDrafts((prev) => ({ ...prev, [route.key]: e.target.value }))}
                      placeholder="Здесь будет CORS XML для выбранного bucket route."
                      className="min-h-[220px] font-mono text-xs"
                    />
                  </div>

                  {result ? (
                    <Alert variant={result.tone}>
                      <AlertTitle>{result.title}</AlertTitle>
                      <AlertDescription className="whitespace-pre-wrap">{result.message}</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertTitle>Результаты запросов</AlertTitle>
                      <AlertDescription>Здесь появятся ответы на test/list/create/delete/CORS операции для route {route.label}.</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* === Тестирование S3 + AI === */}
      <S3TestBench />
    </div>
  );
}

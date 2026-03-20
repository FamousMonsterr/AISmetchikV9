// @ts-nocheck
// src/components/tabs/ProfileTab.tsx
"use client";

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from '@/components/PlanBadge';
import { Copy, Bot, User as UserIcon, Send, Save, Loader2, Mail, Briefcase, KeySquare, Sun, Moon, Monitor, Crown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile, updateMarketingConsent, deleteOwnAccount } from '@/actions/userActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPublicEnvSettings } from '@/actions/adminActions';
import { syncTelegramChatId } from '@/actions/telegramActions';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getNextPlan, getPlanLabel } from '@/lib/plan-utils';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import { Switch } from '@/components/ui/switch';
import { UpgradeAccountDialog } from '@/components/UpgradeAccountDialog';
import { PurchaseProDialog } from '@/components/PurchaseProDialog';
import { useUserTemplates } from '@/hooks/use-user-templates';
import { createUserTemplate, updateUserTemplate, deleteUserTemplate } from '@/actions/templateActions';
import { getTemplateLimitForPlan, type UserTemplate } from '@/lib/template-utils';
import { TemplateConstructorDialog, type TemplateFormValues } from '@/components/templates/TemplateConstructorDialog';
import { useSupportChat } from '@/contexts/SupportChatContext';
import { useDocumentTemplates } from '@/hooks/use-document-templates';
import { filterTemplatesForPlan, resolveDefaultTemplateId } from '@/lib/document-template-utils';
import { signOut } from 'next-auth/react';
import { PasskeyPanel } from '@/components/auth/PasskeyPanel';


export default function ProfileTab() {
  const { user, setUser, telegramUser, effectivePlan } = useAppContext();
  const { toast } = useToast();
  const { open: openSupportChat } = useSupportChat();
  const [isPending, startTransition] = useTransition();
  const [isTemplatePending, startTemplateTransition] = useTransition();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Business' | 'Enterprise'>('PRO');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const { templates: customTemplates, isLoading: isTemplatesLoading } = useUserTemplates();
  const { templates: globalTemplates, settings: templateSettings } = useDocumentTemplates();
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [telegramUsernameState, setTelegramUsernameState] = useState(user?.telegramUsername || '');
  const [documentTemplates, setDocumentTemplates] = useState({
    proposal: user?.documentTemplates?.proposal || '',
    invoice: user?.documentTemplates?.invoice || '',
    contract: user?.documentTemplates?.contract || '',
  });
  const [signatureState, setSignatureState] = useState({
    url: user?.signatureUrl || '',
    objectKey: user?.signatureObjectKey || '',
    expiresAt: user?.signatureUrlExpirationTimestamp || null,
  });
  const [stampState, setStampState] = useState({
    url: user?.stampUrl || '',
    objectKey: user?.stampObjectKey || '',
    expiresAt: user?.stampUrlExpirationTimestamp || null,
  });
  const [avatarState, setAvatarState] = useState({
    url: user?.avatarUrl || '',
    objectKey: user?.avatarObjectKey || '',
    expiresAt: user?.avatarUrlExpirationTimestamp || null,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [botUrl, setBotUrl] = useState('');
  const [isSyncingChat, setIsSyncingChat] = useState(false);
  const { theme, setTheme } = useTheme();

    useEffect(() => {
    const fetchBotUrl = async () => {
            const settings = await getPublicEnvSettings();
            setBotUrl(settings.nextPublicTelegramBotUrl || process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/AI_Smetchik_Bot');
        };
        fetchBotUrl();
    }, []);

  const referralLink = user?.uid ? `${botUrl}?start=ref_${user.uid}` : '';
  const chatLink = user?.uid ? `${botUrl}?start=uid_${user.uid}` : botUrl;

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setTelegramUsernameState(user?.telegramUsername || '');
    setDocumentTemplates({
      proposal: user?.documentTemplates?.proposal || '',
      invoice: user?.documentTemplates?.invoice || '',
      contract: user?.documentTemplates?.contract || '',
    });
    setSignatureState({
      url: user?.signatureUrl || '',
      objectKey: user?.signatureObjectKey || '',
      expiresAt: user?.signatureUrlExpirationTimestamp || null,
    });
    setStampState({
      url: user?.stampUrl || '',
      objectKey: user?.stampObjectKey || '',
      expiresAt: user?.stampUrlExpirationTimestamp || null,
    });
    setAvatarState({
      url: user?.avatarUrl || '',
      objectKey: user?.avatarObjectKey || '',
      expiresAt: user?.avatarUrlExpirationTimestamp || null,
    });
  }, [user]);

  const handleCopy = (textToCopy: string, successMessage: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Скопировано!",
      description: successMessage,
    });
  };

  const handleProfileUpdate = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateUserProfile({
        userId: user.uid,
        displayName,
        telegramUsername: telegramUsernameState,
        documentTemplates,
        signatureUrl: signatureState.url || null,
        signatureObjectKey: signatureState.objectKey || null,
        signatureUrlExpirationTimestamp: typeof signatureState.expiresAt === 'number' ? signatureState.expiresAt : null,
        stampUrl: stampState.url || null,
        stampObjectKey: stampState.objectKey || null,
        stampUrlExpirationTimestamp: typeof stampState.expiresAt === 'number' ? stampState.expiresAt : null,
        avatarUrl: avatarState.url || null,
        avatarObjectKey: avatarState.objectKey || null,
        avatarUrlExpirationTimestamp: typeof avatarState.expiresAt === 'number' ? avatarState.expiresAt : null,
      });

      if (result.success) {
        toast({ title: "Успех", description: result.message });
        // Optimistically update context
        setUser({
          ...user,
          displayName,
          telegramUsername: telegramUsernameState,
          documentTemplates,
          signatureUrl: signatureState.url || null,
          signatureObjectKey: signatureState.objectKey || null,
          signatureUrlExpirationTimestamp: signatureState.expiresAt || null,
          stampUrl: stampState.url || null,
          stampObjectKey: stampState.objectKey || null,
          stampUrlExpirationTimestamp: stampState.expiresAt || null,
          avatarUrl: avatarState.url || null,
          avatarObjectKey: avatarState.objectKey || null,
          avatarUrlExpirationTimestamp: avatarState.expiresAt || null,
        });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  const openUpgradeDialog = (role: 'PRO' | 'Business' | 'Enterprise') => {
    setUpgradeTargetRole(role);
    setIsUpgradeOpen(true);
  };

  const currentPlan = effectivePlan || 'Free';
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanLabel = getPlanLabel(nextPlan);

  const handleNextPlanClick = () => {
    if (!nextPlan) return;
    if (nextPlan === 'PRO') {
      setIsPurchaseOpen(true);
      return;
    }
    openUpgradeDialog(nextPlan);
  };

  const handleMarketingToggle = (checked: boolean) => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateMarketingConsent({ userId: user.uid, agreedToMarketing: checked });
      if (result.success) {
        setUser({ ...user, agreedToMarketing: checked });
        toast({ title: 'Настройки рассылок обновлены', description: result.message });
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleSyncChatId = async () => {
    if (!user) return;
    setIsSyncingChat(true);
    try {
      const result = await syncTelegramChatId();
      if (!result.success) {
        throw new Error(result.message);
      }
      toast({ title: "Готово", description: result.message });
      setUser({
        ...user,
        telegramChatId: result.chatId || user.telegramChatId,
      });
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message || 'Не удалось получить chat_id.', variant: "destructive" });
    } finally {
      setIsSyncingChat(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    const confirmed = window.confirm('Удалить аккаунт? Это действие необратимо.');
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteOwnAccount();
      if (!result.success) {
        toast({ title: 'Ошибка удаления', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Аккаунт удален', description: 'Сессия будет завершена.' });
      await signOut({ callbackUrl: '/auth/login' });
    });
  };

  const openTemplateDialog = (template?: UserTemplate | null) => {
    setEditingTemplate(template || null);
    setIsTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = (values: TemplateFormValues) => {
    if (!user) return;
    startTemplateTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description || '',
        accentColor: values.accentColor,
        headerStyle: values.headerStyle,
        showSignature: values.showSignature,
        showStamp: values.showStamp,
      };
      const result = editingTemplate
        ? await updateUserTemplate({
            userId: user.uid,
            templateId: editingTemplate.id,
            updates: payload,
          })
        : await createUserTemplate({
            userId: user.uid,
            ...payload,
            docType: 'proposal',
          });

      if (result.success) {
        toast({ title: 'Готово', description: result.message });
        setIsTemplateDialogOpen(false);
        setEditingTemplate(null);
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleTemplateDelete = (template: UserTemplate) => {
    if (!user) return;
    const confirmed = window.confirm(`Удалить шаблон "${template.name}"?`);
    if (!confirmed) return;
    startTemplateTransition(async () => {
      const result = await deleteUserTemplate({ userId: user.uid, templateId: template.id });
      if (result.success) {
        toast({ title: 'Удалено', description: result.message });
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const canEditTemplates = effectivePlan !== 'Free';
  const templatesChanged = canEditTemplates && (
    documentTemplates.proposal !== (user?.documentTemplates?.proposal || '') ||
    documentTemplates.invoice !== (user?.documentTemplates?.invoice || '') ||
    documentTemplates.contract !== (user?.documentTemplates?.contract || '')
  );

  const isProfileChanged =
    displayName !== user?.displayName ||
    telegramUsernameState !== user?.telegramUsername ||
    templatesChanged ||
    signatureState.url !== (user?.signatureUrl || '') ||
    signatureState.objectKey !== (user?.signatureObjectKey || '') ||
    stampState.url !== (user?.stampUrl || '') ||
    stampState.objectKey !== (user?.stampObjectKey || '') ||
    avatarState.url !== (user?.avatarUrl || '') ||
    avatarState.objectKey !== (user?.avatarObjectKey || '');

  const customProposalTemplates = useMemo(
    () => customTemplates.filter((template) => template.docType === 'proposal'),
    [customTemplates],
  );

  const templateOptions = useMemo(() => {
    return {
      proposal: [
        ...filterTemplatesForPlan(globalTemplates, templateSettings, effectivePlan, 'proposal'),
        ...(effectivePlan !== 'Free' ? customProposalTemplates : []),
      ],
      invoice: filterTemplatesForPlan(globalTemplates, templateSettings, effectivePlan, 'invoice'),
      contract: filterTemplatesForPlan(globalTemplates, templateSettings, effectivePlan, 'contract'),
    };
  }, [effectivePlan, customProposalTemplates, globalTemplates, templateSettings]);

  const templateLimit = getTemplateLimitForPlan(effectivePlan);
  const templateCount = customProposalTemplates.length;
  const canUseConstructor = templateLimit > 0;
  const isLimitReached = canUseConstructor && templateCount >= templateLimit;

  useEffect(() => {
    const proposalDefault = resolveDefaultTemplateId(templateSettings, effectivePlan, 'proposal', templateOptions.proposal[0]?.id || '');
    const invoiceDefault = resolveDefaultTemplateId(templateSettings, effectivePlan, 'invoice', templateOptions.invoice[0]?.id || '');
    const contractDefault = resolveDefaultTemplateId(templateSettings, effectivePlan, 'contract', templateOptions.contract[0]?.id || '');

    setDocumentTemplates((prev) => ({
      proposal: prev.proposal || proposalDefault,
      invoice: prev.invoice || invoiceDefault,
      contract: prev.contract || contractDefault,
    }));
  }, [templateOptions, templateSettings, effectivePlan]);

  const uploadAsset = async (file: File, bucketType?: 'analysis' | 'avatars' | 'user_docs' | 'project_docs' | 'default' | 'personal') => {
    const presignedUrlResponse = await fetch("/api/s3-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type, bucketType }),
    });
    if (!presignedUrlResponse.ok) {
      throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки.");
    }
    const { uploadUrl, accessUrl, objectKey, urlExpirationTimestamp } = await presignedUrlResponse.json();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error('Не удалось загрузить файл в хранилище.');
    }
    return { accessUrl, objectKey, urlExpirationTimestamp };
  };

  const handleAssetChange = async (type: 'signature' | 'stamp' | 'avatar', file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ошибка', description: 'Поддерживаются только изображения.', variant: 'destructive' });
      return;
    }
    if (type === 'signature') setIsUploadingSignature(true);
    if (type === 'stamp') setIsUploadingStamp(true);
    if (type === 'avatar') setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadAsset(file, type === 'avatar' ? 'avatars' : 'user_docs');
      if (type === 'signature') {
        setSignatureState({ url: uploaded.accessUrl, objectKey: uploaded.objectKey, expiresAt: uploaded.urlExpirationTimestamp });
      } else if (type === 'stamp') {
        setStampState({ url: uploaded.accessUrl, objectKey: uploaded.objectKey, expiresAt: uploaded.urlExpirationTimestamp });
      } else {
        setAvatarState({ url: uploaded.accessUrl, objectKey: uploaded.objectKey, expiresAt: uploaded.urlExpirationTimestamp });
        if (user) {
          const result = await updateUserProfile({
            userId: user.uid,
            displayName,
            telegramUsername: telegramUsernameState,
            avatarUrl: uploaded.accessUrl,
            avatarObjectKey: uploaded.objectKey,
            avatarUrlExpirationTimestamp: typeof uploaded.urlExpirationTimestamp === 'number' ? uploaded.urlExpirationTimestamp : null,
          });
          if (result.success) {
            setUser({
              ...user,
              avatarUrl: uploaded.accessUrl,
              avatarObjectKey: uploaded.objectKey,
              avatarUrlExpirationTimestamp: uploaded.urlExpirationTimestamp || null,
            });
          } else {
            toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
          }
        }
      }
      toast({ title: 'Готово', description: 'Файл загружен и готов к использованию.' });
    } catch (error: any) {
      toast({ title: 'Ошибка загрузки', description: error.message, variant: 'destructive' });
    } finally {
      if (type === 'signature') setIsUploadingSignature(false);
      if (type === 'stamp') setIsUploadingStamp(false);
      if (type === 'avatar') setIsUploadingAvatar(false);
    }
  };

  const handleAvatarSelect = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ошибка', description: 'Поддерживаются только изображения.', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setIsAvatarCropOpen(true);
  };

  const handleAssetRemove = (type: 'signature' | 'stamp' | 'avatar') => {
    if (type === 'signature') {
      setSignatureState({ url: '', objectKey: '', expiresAt: null });
    } else if (type === 'stamp') {
      setStampState({ url: '', objectKey: '', expiresAt: null });
    } else {
      setAvatarState({ url: '', objectKey: '', expiresAt: null });
      if (user) {
        updateUserProfile({
          userId: user.uid,
          displayName,
          telegramUsername: telegramUsernameState,
          avatarUrl: null,
          avatarObjectKey: null,
          avatarUrlExpirationTimestamp: null,
        }).then((result) => {
          if (result.success) {
            setUser({
              ...user,
              avatarUrl: null,
              avatarObjectKey: null,
              avatarUrlExpirationTimestamp: null,
            });
          } else {
            toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
          }
        });
      }
    }
  };


  return (
    <div className="space-y-6">
       {user?.managerData && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase/>Ваш менеджер</CardTitle>
                <CardDescription>Ваш персональный помощник для решения любых вопросов.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.managerData.email}.png`} alt={user.managerData.displayName} />
                    <AvatarFallback>{user.managerData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{user.managerData.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.managerData.email}</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={openSupportChat}>
                    <Mail className="mr-2 h-4 w-4"/>
                    Написать менеджеру
                </Button>
            </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Профиль</CardTitle>
              <CardDescription>Ваши данные и настройки аккаунта.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarState.url || (user?.email ? `https://avatar.vercel.sh/${user.email}.png` : undefined)} alt={user?.displayName || 'Avatar'} />
                  <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" asChild disabled={isUploadingAvatar}>
                  <label className="cursor-pointer">
                    {isUploadingAvatar ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Загрузить
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handleAvatarSelect(e.target.files?.[0]);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </Button>
                {avatarState.url && (
                  <Button variant="ghost" size="sm" onClick={() => handleAssetRemove('avatar')} disabled={isUploadingAvatar}>
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
           <LabelInputContainer>
            <Label htmlFor="displayName">Никнейм</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ваш никнейм" disabled={isPending}/>
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="telegramUsername">Имя пользователя Telegram</Label>
            <Input id="telegramUsername" value={telegramUsernameState} onChange={(e) => setTelegramUsernameState(e.target.value)} placeholder="@username" disabled={isPending}/>
          </LabelInputContainer>
           <LabelInputContainer>
            <Label>Email</Label>
            <Input value={user?.email || ""} readOnly disabled />
          </LabelInputContainer>
          <div className="space-y-1">
            <Label>Роль</Label>
            <div>
              <Badge variant="secondary">{user?.systemRole}</Badge>
            </div>
          </div>
           <LabelInputContainer>
            <Label>Уникальный ID пользователя</Label>
            <div className="flex items-center gap-2">
              <Input value={user?.uid || ""} readOnly disabled />
              <Button variant="outline" size="icon" onClick={() => handleCopy(user?.uid || '', 'Ваш User ID скопирован в буфер обмена.')} disabled={!user?.uid} aria-label="Скопировать ID пользователя">
                  <Copy className="h-4 w-4" />
              </Button>
            </div>
          </LabelInputContainer>
           <LabelInputContainer>
            <Label>Кредиты</Label>
            <Input value={user?.credits || 0} readOnly disabled />
          </LabelInputContainer>
          {nextPlan && (
            <div className="space-y-2">
              <Label>Следующий тариф</Label>
              <Button onClick={handleNextPlanClick} className="w-full justify-start">
                <Crown className="mr-2 h-4 w-4" />
                Перейти на {nextPlanLabel}
              </Button>
            </div>
          )}
        </CardContent>
         <CardFooter>
            <button
                className="group/btn relative block h-10 w-full rounded-md bg-primary font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                type="button"
                onClick={handleProfileUpdate} 
                disabled={isPending || !isProfileChanged}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : <Save className="mr-2 h-4 w-4 inline-block" />}
              Сохранить изменения
              <BottomGradient />
            </button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Рассылки и бонусы</CardTitle>
          <CardDescription>Управляйте подпиской на рассылку и бонусными кредитами.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Подписка на рассылку</p>
              <p className="text-sm text-muted-foreground">
                Активная подписка дает +10 бонусных кредитов в месяц на Free и PRO. Отключение вступит в силу со следующего периода.
              </p>
            </div>
            <Switch checked={!!user?.agreedToMarketing} onCheckedChange={handleMarketingToggle} disabled={isPending} />
          </div>
          {!!user?.agreedToMarketing && (
            <div className="overflow-hidden rounded-md border bg-muted/30 px-3 py-2">
              <div className="whitespace-nowrap text-xs text-muted-foreground animate-marquee">
                Подписка активна: +10 бонусных кредитов каждый месяц для Free/PRO. Отмена вступит в силу со следующего периода получения бонусов.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки темы</CardTitle>
          <CardDescription>Выберите предпочтительную цветовую схему интерфейса.</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Sun className="mb-3 h-6 w-6" />
                        Светлая
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Moon className="mb-3 h-6 w-6" />
                        Темная
                    </Label>
                </div>
                 <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Monitor className="mb-3 h-6 w-6" />
                        Системная
                    </Label>
                </div>
            </RadioGroup>
        </CardContent>
      </Card>

      <PasskeyPanel
        mode="both"
        title="Passkey и безопасность"
        description="Зарегистрируйте passkey для быстрого входа без пароля и управляйте уже сохранёнными устройствами."
      />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Опасная зона</CardTitle>
          <CardDescription>Удаление аккаунта для очистки тестовых данных и регистрации.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={isPending || !!user?.qaProtected}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Удалить аккаунт
          </Button>
          {user?.qaProtected ? (
            <p className="mt-2 text-xs text-muted-foreground">QA-защита включена, удаление запрещено.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны документов</CardTitle>
          <CardDescription>Выберите шаблоны по умолчанию для документов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEditTemplates && (
            <Alert>
              <AlertTitle>Недоступно на Free</AlertTitle>
              <AlertDescription className="space-y-2">
                <div>Настройка шаблонов доступна на PRO и выше.</div>
                <PlanBadge plan="PRO" size="xs" />
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>КП</Label>
              <Select
                value={documentTemplates.proposal}
                onValueChange={(value) => setDocumentTemplates((prev) => ({ ...prev, proposal: value }))}
                disabled={!canEditTemplates}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.proposal.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.userId ? `${item.name} (ваш)` : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Счет</Label>
              <Select
                value={documentTemplates.invoice}
                onValueChange={(value) => setDocumentTemplates((prev) => ({ ...prev, invoice: value }))}
                disabled={!canEditTemplates}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.invoice.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Договор</Label>
              <Select
                value={documentTemplates.contract}
                onValueChange={(value) => setDocumentTemplates((prev) => ({ ...prev, contract: value }))}
                disabled={!canEditTemplates}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.contract.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Конструктор КП</CardTitle>
          <CardDescription>Создавайте фирменные шаблоны коммерческого предложения.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canUseConstructor ? (
            <Alert>
              <AlertTitle>Доступно на PRO и выше</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>Конструктор шаблонов — PRO функция.</span>
                <PlanBadge plan="PRO" size="xs" />
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Создано шаблонов: {templateCount} из {templateLimit}</div>
                  <div className="text-xs text-muted-foreground">PRO — 1, Business — 10, Enterprise — 50</div>
                </div>
                <Button onClick={() => openTemplateDialog(null)} disabled={isLimitReached || isTemplatePending}>
                  Создать шаблон
                </Button>
              </div>

              {isTemplatesLoading ? (
                <div className="text-sm text-muted-foreground">Загрузка шаблонов...</div>
              ) : customProposalTemplates.length === 0 ? (
                <div className="text-sm text-muted-foreground">Пока нет собственных шаблонов.</div>
              ) : (
                <div className="grid gap-3">
                  {customProposalTemplates.map((template) => (
                    <div key={template.id} className="rounded-lg border p-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{template.name}</div>
                        {template.description && <div className="text-xs text-muted-foreground">{template.description}</div>}
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                          <span>Стиль: {template.headerStyle || 'standard'}</span>
                          <span className="flex items-center gap-1">
                            Цвет: <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: template.accentColor || '#0f172a' }} />
                          </span>
                          <span>Подпись: {template.showSignature === false ? 'нет' : 'да'}</span>
                          <span>Печать: {template.showStamp === false ? 'нет' : 'да'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openTemplateDialog(template)} disabled={isTemplatePending}>
                          Редактировать
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleTemplateDelete(template)} disabled={isTemplatePending}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Подпись и печать</CardTitle>
          <CardDescription>Добавьте изображение подписи и печати для документов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEditTemplates && (
            <Alert>
              <AlertTitle>Недоступно на Free</AlertTitle>
              <AlertDescription className="space-y-2">
                <div>Загрузка подписи и печати доступна на PRO и выше.</div>
                <PlanBadge plan="PRO" size="xs" />
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Подпись</Label>
              {signatureState.url ? (
                <div className="space-y-2">
                  <img src={signatureState.url} alt="Подпись" className="max-h-24 rounded border" />
                  <Button variant="outline" onClick={() => handleAssetRemove('signature')} disabled={!canEditTemplates}>
                    Удалить подпись
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  disabled={!canEditTemplates || isUploadingSignature}
                  onChange={(e) => handleAssetChange('signature', e.target.files?.[0])}
                />
              )}
              {isUploadingSignature && <p className="text-xs text-muted-foreground">Загрузка подписи...</p>}
            </div>
            <div className="space-y-2">
              <Label>Печать</Label>
              {stampState.url ? (
                <div className="space-y-2">
                  <img src={stampState.url} alt="Печать" className="max-h-28 rounded border" />
                  <Button variant="outline" onClick={() => handleAssetRemove('stamp')} disabled={!canEditTemplates}>
                    Удалить печать
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  disabled={!canEditTemplates || isUploadingStamp}
                  onChange={(e) => handleAssetChange('stamp', e.target.files?.[0])}
                />
              )}
              {isUploadingStamp && <p className="text-xs text-muted-foreground">Загрузка печати...</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Интеграция с Telegram</CardTitle>
          <CardDescription>Привяжите ваш аккаунт Telegram для получения уведомлений и файлов прямо в мессенджер.</CardDescription>
        </CardHeader>
        <CardContent>
            {user?.telegramChatId ? (
                <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600"/>
                    <AlertTitle className="text-green-800 dark:text-green-300">Аккаунт успешно привязан</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        Ваш аккаунт связан с Telegram: <strong>@{user.telegramUsername || telegramUser?.username || 'user'}</strong>. Теперь вы можете получать файлы прямо в чат с ботом.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleSyncChatId} disabled={isSyncingChat}>
                              {isSyncingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Обновить chat-ID
                          </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <Bot className="h-4 w-4"/>
                    <AlertTitle>Аккаунт не привязан</AlertTitle>
                    <AlertDescription>
                        Чтобы получать файлы в Telegram, откройте бота и напишите /start. Затем нажмите «Получить chat-ID».
                    </AlertDescription>
                     <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild>
                              <a href={chatLink} target="_blank" rel="noopener noreferrer">
                                  <Bot className="mr-2 h-4 w-4"/>
                                  Открыть бота
                              </a>
                          </Button>
                          <Button variant="outline" onClick={handleSyncChatId} disabled={isSyncingChat}>
                              {isSyncingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Получить chat-ID
                          </Button>
                        </div>
                    </div>
                </Alert>
            )}
        </CardContent>
      </Card>

      <AvatarCropDialog
        isOpen={isAvatarCropOpen}
        file={avatarFile}
        onClose={() => {
          setIsAvatarCropOpen(false);
          setAvatarFile(null);
        }}
        onConfirm={(croppedFile) => {
          setIsAvatarCropOpen(false);
          setAvatarFile(null);
          handleAssetChange('avatar', croppedFile);
        }}
      />

      <TemplateConstructorDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => {
          setIsTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        onSubmit={handleTemplateSubmit}
        isSubmitting={isTemplatePending}
        initialTemplate={editingTemplate}
      />

      <UpgradeAccountDialog
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        targetRole={upgradeTargetRole}
      />

      <PurchaseProDialog
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
      />
      
    </div>
  );
}

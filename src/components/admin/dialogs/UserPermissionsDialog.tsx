// src/components/admin/dialogs/UserPermissionsDialog.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Calendar as CalendarIcon, Briefcase, TestTube, Bug, Handshake, Edit, Shield, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserPermissions } from '@/actions/adminActions';
import type { AppUser, SystemRole, UserPlan } from '@/contexts/AppContext';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import aiConfig from '@/lib/ai-config.json';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';

const { apiModels } = aiConfig as any;

interface UserPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: AppUser | null;
  currentUserId: string;
  managers: AppUser[];
}

export function UserPermissionsDialog({ isOpen, onClose, onSuccess, user, currentUserId, managers }: UserPermissionsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [editablePermissions, setEditablePermissions] = useState<Partial<AppUser>>({});

  useEffect(() => {
    if (user) {
        let expiryDate = null;
        if (user.planExpiresAt && typeof user.planExpiresAt.toDate === 'function') {
          expiryDate = user.planExpiresAt.toDate();
        } else if (user.planExpiresAt instanceof Date) {
          expiryDate = user.planExpiresAt;
        }

        setEditablePermissions({
            systemRole: user.systemRole,
            plan: user.plan,
            isTester: user.isTester,
            isDebugger: user.isDebugger,
            isPartner: user.isPartner,
            isEditor: user.isEditor,
            maxCompanies: user.maxCompanies,
            maxActiveProjects: user.maxActiveProjects,
            maxDraftsPerProject: user.maxDraftsPerProject,
            availableModels: user.availableModels,
            canShareProjects: user.canShareProjects,
            canUsePrivatePriceBase: user.canUsePrivatePriceBase,
            canGroupProjects: user.canGroupProjects,
            planExpiresAt: expiryDate,
            managerId: user.managerId,
            partnerStatus: user.partnerStatus,
        });
    }
  }, [user]);

  const handlePermissionChange = (field: keyof AppUser, value: any) => {
    setEditablePermissions(prev => ({...prev, [field]: value}));
  };

  const handleModelSelectionChange = (modelValue: string, checked: boolean) => {
    setEditablePermissions(prev => {
        const currentModels = prev.availableModels || [];
        if (checked) {
            return {...prev, availableModels: [...currentModels, modelValue]};
        } else {
            return {...prev, availableModels: currentModels.filter(m => m !== modelValue)};
        }
    });
  };

  const handleUpdate = () => {
    if (!user || !currentUserId) return;
    startTransition(async () => {
      const updates = {
          ...editablePermissions,
          managerId: 'managerId' in editablePermissions ? editablePermissions.managerId : undefined,
          partnerStatus: 'partnerStatus' in editablePermissions ? editablePermissions.partnerStatus : undefined,
          // Explicitly set role for self-edit scenario
          systemRole: user.uid === currentUserId ? 'Super Admin' : editablePermissions.systemRole
      };

      const result = await updateUserPermissions({ currentUserId, targetUid: user.uid, updates });

      if (result.success) {
        toast({ title: "Успех", description: result.message });
        onSuccess();
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
      onClose();
    });
  };

  const isSuperAdminUser = !!process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL && user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Роль и права доступа</DialogTitle>
          <DialogDescription className="truncate">Управление правами для {user?.email}.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
          <div className="py-4 space-y-6">
            <LabelInputContainer>
              <Label htmlFor="role-select">Системная роль</Label>
              <Select value={editablePermissions.systemRole} onValueChange={(value: SystemRole) => handlePermissionChange('systemRole', value)} disabled={isSuperAdminUser}>
                <SelectTrigger id="role-select"><SelectValue placeholder="Выберите роль" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                   {isSuperAdminUser && <SelectItem value="Super Admin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
              {isSuperAdminUser && (
                <p className="text-xs text-muted-foreground">Роль этого администратора защищена и не может быть изменена.</p>
              )}
            </LabelInputContainer>
            
            <div className="space-y-3">
              <Label>Атрибуты</Label>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="isTester" className="font-normal flex items-center gap-2"><TestTube className="h-4 w-4"/>Тестировщик</Label><Switch id="isTester" checked={!!editablePermissions.isTester} onCheckedChange={(checked) => handlePermissionChange('isTester', checked)} /></div>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="isDebugger" className="font-normal flex items-center gap-2"><Bug className="h-4 w-4"/>Отладчик</Label><Switch id="isDebugger" checked={!!editablePermissions.isDebugger} onCheckedChange={(checked) => handlePermissionChange('isDebugger', checked)} /></div>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="isPartner" className="font-normal flex items-center gap-2"><Handshake className="h-4 w-4"/>Партнер</Label><Switch id="isPartner" checked={!!editablePermissions.isPartner} onCheckedChange={(checked) => handlePermissionChange('isPartner', checked)} /></div>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="isEditor" className="font-normal flex items-center gap-2"><Edit className="h-4 w-4"/>Редактор</Label><Switch id="isEditor" checked={!!editablePermissions.isEditor} onCheckedChange={(checked) => handlePermissionChange('isEditor', checked)} /></div>
            </div>

            <LabelInputContainer>
              <Label htmlFor="plan-select">Тарифный план</Label>
              <Select value={editablePermissions.plan} onValueChange={(value: UserPlan) => handlePermissionChange('plan', value)}>
                <SelectTrigger id="plan-select"><SelectValue placeholder="Выберите план" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </LabelInputContainer>
            
            <LabelInputContainer>
              <Label htmlFor="partner-status-select" className="flex items-center"><Shield className="mr-2 h-4 w-4"/>Статус партнера</Label>
              <Select value={editablePermissions.partnerStatus || 'none'} onValueChange={(value) => handlePermissionChange('partnerStatus', value === 'none' ? null : value)}>
                <SelectTrigger id="partner-status-select"><SelectValue placeholder="Нет статуса"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Нет статуса</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </LabelInputContainer>


            <LabelInputContainer>
              <Label htmlFor="date">Срок действия плана</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editablePermissions.planExpiresAt && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editablePermissions.planExpiresAt && isValid(editablePermissions.planExpiresAt as Date) ? format(editablePermissions.planExpiresAt as Date, "PPP", { locale: ru }) : <span>Бессрочно</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={editablePermissions.planExpiresAt as Date | undefined} onSelect={(date) => handlePermissionChange('planExpiresAt', date)} initialFocus />
                  <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => handlePermissionChange('planExpiresAt', null)}>Очистить</Button></div>
                </PopoverContent>
              </Popover>
            </LabelInputContainer>
            
            <LabelInputContainer>
              <Label htmlFor="manager-select" className="flex items-center"><Briefcase className="mr-2 h-4 w-4"/>Менеджер</Label>
              <Select value={editablePermissions.managerId || 'none'} onValueChange={(value) => handlePermissionChange('managerId', value === 'none' ? null : value)}>
                <SelectTrigger id="manager-select"><SelectValue placeholder="Не назначен"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {managers.map(manager => (<SelectItem key={manager.uid} value={manager.uid}>{manager.displayName} ({manager.email})</SelectItem>))}
                </SelectContent>
              </Select>
            </LabelInputContainer>

            <LabelInputContainer><Label>Макс. компаний</Label><Input type="number" value={editablePermissions.maxCompanies || 1} onChange={(e) => handlePermissionChange('maxCompanies', Number(e.target.value))} /></LabelInputContainer>
            <LabelInputContainer><Label>Макс. активных проектов</Label><Input type="number" value={editablePermissions.maxActiveProjects || 10} onChange={(e) => handlePermissionChange('maxActiveProjects', Number(e.target.value))} /></LabelInputContainer>
            <LabelInputContainer><Label>Макс. версий на проект</Label><Input type="number" value={editablePermissions.maxDraftsPerProject || 5} onChange={(e) => handlePermissionChange('maxDraftsPerProject', Number(e.target.value))} /></LabelInputContainer>
            
            <div className="space-y-3">
              <Label>PRO-функции</Label>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="share-projects" className="font-normal">Поделиться проектом</Label><Switch id="share-projects" checked={!!editablePermissions.canShareProjects} onCheckedChange={(checked) => handlePermissionChange('canShareProjects', checked)} /></div>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="private-prices" className="font-normal">Приватная база цен</Label><Switch id="private-prices" checked={!!editablePermissions.canUsePrivatePriceBase} onCheckedChange={(checked) => handlePermissionChange('canUsePrivatePriceBase', checked)} /></div>
              <div className="flex items-center justify-between p-2 border rounded-md"><Label htmlFor="group-projects" className="font-normal">Группировка проектов</Label><Switch id="group-projects" checked={!!editablePermissions.canGroupProjects} onCheckedChange={(checked) => handlePermissionChange('canGroupProjects', checked)} /></div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center"><Bot className="mr-2 h-4 w-4"/>Доступные AI Модели</Label>
              {apiModels.map((model: any) => (
                <div key={model.value} className="flex items-center justify-between p-2 border rounded-md">
                  <Label htmlFor={`model-${model.value}`} className="font-normal">{model.label}</Label>
                  <Switch id={`model-${model.value}`} checked={(editablePermissions.availableModels || []).includes(model.value)} onCheckedChange={(checked) => handleModelSelectionChange(model.value, checked)} />
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

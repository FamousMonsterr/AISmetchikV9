// src/components/PurchaseProDialog.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, Building, User, CreditCard, UploadCloud, PhoneCall, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type Company } from '@/contexts/AppContext';
import { onSnapshot, query, collection, where, addDoc, serverTimestamp } from '@/lib/db-client';
import { db } from '@/lib/db';
import { getLegalEntity } from '@/actions/adminActions';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import InvoiceTemplate from './pdf/InvoiceTemplate';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import proConfig from '@/lib/pro-subscription-config.json';
import { createLegalProSubscriptionOrder, createSbpProSubscriptionOrder } from '@/actions/proSubscriptionActions';
import { activateTrial } from '@/actions/adminActions';

type ProPlanOption = {
  months: number;
  label: string;
  price: number;
  isLifetime?: boolean;
};

interface PurchaseProDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseProDialog({ isOpen, onClose }: PurchaseProDialogProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'individual' | 'legal'>('individual');
  const [isSubmitting, startSubmitting] = useTransition();
  const [isTrialPending, startTrialTransition] = useTransition();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const hasUsedTrial = user?.hasUsedTrial || false;

  const planOptions: ProPlanOption[] = useMemo(() => {
    const durations = proConfig.durationsMonths || [6, 9, 12];
    const lifetimeMonths = proConfig.lifetimeMonths || 24;
    const monthlyPrice = proConfig.monthlyPrice || 2990;
    const options: ProPlanOption[] = durations.map((months) => ({
      months,
      label: `${months} мес.`,
      price: months * monthlyPrice,
    }));
    options.push({
      months: lifetimeMonths,
      label: 'Пожизненный PRO',
      price: lifetimeMonths * monthlyPrice,
      isLifetime: true,
    });
    return options;
  }, []);

  const [selectedMonths, setSelectedMonths] = useState(planOptions[0]?.months || 6);

  const selectedPlan = planOptions.find((option) => option.months === selectedMonths) || planOptions[0];
  const sbpPhone = proConfig.sbpPhone || '+79114185037';
  const sbpBank = proConfig.sbpBank || 'Сбербанк';
  const sbpLink = proConfig.sbpPaymentLink || '';

  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod('individual');
    setReceiptFile(null);
  }, [isOpen]);

  const handleActivateTrial = () => {
    if (!user || hasUsedTrial) return;
    startTrialTransition(async () => {
      const result = await activateTrial({ userId: user.uid, plan: 'PRO' });
      if (result.success) {
        toast({ title: 'Пробный период активирован', description: result.message });
        onClose();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  useEffect(() => {
    if (isOpen && user && paymentMethod === 'legal') {
      setIsLoadingCompanies(true);
      const q = query(collection(db, 'companies'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const fetchedCompanies = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Company));
          const ownCompanies = fetchedCompanies.filter((company: Company) => !company.isClient);
          setCompanies(ownCompanies);
          const defaultCompany = ownCompanies.find((c: Company) => c.isDefault) || ownCompanies[0];
          if (defaultCompany) {
            setSelectedCompanyId(defaultCompany.id);
          }
          setIsLoadingCompanies(false);
        },
        (error) => {
          console.error("Error fetching companies:", error);
          toast({ title: "Ошибка", description: "Не удалось загрузить список ваших компаний.", variant: "destructive" });
          setIsLoadingCompanies(false);
        },
      );
      return () => unsubscribe();
    }
  }, [isOpen, user, paymentMethod, toast]);

  const handleSubmitSbp = () => {
    if (!user) return;
    if (!receiptFile) {
      toast({ title: 'Нужен чек', description: 'Загрузите чек перевода по СБП.', variant: 'destructive' });
      return;
    }
    startSubmitting(async () => {
      try {
        const presignedUrlResponse = await fetch("/api/s3-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: receiptFile.name, fileType: receiptFile.type, bucketType: 'user_docs' }),
        });
        if (!presignedUrlResponse.ok) {
          throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки.");
        }
        const { uploadUrl, accessUrl, objectKey } = await presignedUrlResponse.json();
        await axios.put(uploadUrl, receiptFile, { headers: { 'Content-Type': receiptFile.type } });

        const result = await createSbpProSubscriptionOrder({
          userId: user.uid,
          months: selectedPlan.months,
          receiptUrl: accessUrl,
          receiptObjectKey: objectKey,
          receiptFileName: receiptFile.name,
        });

        if (!result.success) {
          throw new Error(result.message || 'Не удалось отправить чек.');
        }
        toast({
          title: 'Чек отправлен',
          description: 'Проверка займет до 24 часов. На это время PRO активирован на 1 день.',
        });
        onClose();
      } catch (error: any) {
        toast({ title: 'Ошибка', description: error.message || 'Не удалось отправить чек.', variant: 'destructive' });
      }
    });
  };

  const handleGenerateInvoice = () => {
    if (!user) return;
    startSubmitting(async () => {
      try {
        const buyerCompany = companies.find((c) => c.id === selectedCompanyId);
        if (!buyerCompany) {
          throw new Error('Выберите компанию для выставления счета.');
        }

        const sellerCompany = await getLegalEntity();
        if (!sellerCompany) {
          throw new Error("Реквизиты продавца не настроены в системе.");
        }

        const invoiceNumber = `PRO-${Date.now()}`;
        const invoiceDate = new Date();

        const docToRender = (
          <InvoiceTemplate
            invoiceNumber={invoiceNumber}
            invoiceDate={invoiceDate}
            seller={sellerCompany}
            buyer={buyerCompany}
            items={[
              {
                name: selectedPlan.isLifetime
                  ? `Пожизненная подписка PRO (эквивалент ${selectedPlan.months} мес.)`
                  : `Подписка PRO на ${selectedPlan.months} мес.`,
                quantity: 1,
                unit: 'подп.',
                price: selectedPlan.price,
              },
            ]}
          />
        );

        const blob = await pdf(docToRender).toBlob();
        const fileName = `Счет_${invoiceNumber}_от_${invoiceDate.toLocaleDateString()}.pdf`;

        const presignedUrlResponse = await fetch("/api/s3-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, fileType: blob.type, bucketType: 'user_docs' }),
        });
        if (!presignedUrlResponse.ok) {
          throw new Error((await presignedUrlResponse.json()).error || "Не удалось получить ссылку для загрузки.");
        }
        const { uploadUrl, accessUrl } = await presignedUrlResponse.json();
        await axios.put(uploadUrl, blob, { headers: { 'Content-Type': blob.type } });

        await addDoc(collection(db, 'invoices'), {
          userId: user.uid,
          invoiceNumber,
          invoiceDate: serverTimestamp(),
          buyerName: buyerCompany.name,
          totalAmount: selectedPlan.price,
          downloadUrl: accessUrl,
          status: 'Ожидает оплаты',
          type: 'pro_subscription',
        });

        await createLegalProSubscriptionOrder({
          userId: user.uid,
          months: selectedPlan.months,
          invoiceUrl: accessUrl,
          invoiceNumber,
          companyId: buyerCompany.id,
          companyName: buyerCompany.name,
        });

        saveAs(blob, fileName);
        toast({ title: "Счет создан", description: "Счет скачан и сохранен в истории документов." });
        onClose();
      } catch (error: any) {
        toast({ title: "Ошибка счета", description: error.message || 'Не удалось создать счет.', variant: "destructive" });
      }
    });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оформление PRO подписки</DialogTitle>
          <DialogDescription>
            Выберите срок подписки и способ оплаты.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!hasUsedTrial && (
            <Alert className="bg-green-50 border-green-200">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Пробный период PRO</AlertTitle>
              <AlertDescription className="text-green-700 space-y-2">
                <div>Вы можете активировать PRO бесплатно на 3 дня.</div>
                <Button size="sm" variant="secondary" onClick={handleActivateTrial} disabled={isTrialPending}>
                  {isTrialPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Попробовать бесплатно
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Срок подписки</Label>
            <RadioGroup value={String(selectedMonths)} onValueChange={(value) => setSelectedMonths(Number(value))} className="grid gap-2 mt-2 sm:grid-cols-2">
              {planOptions.map((option) => (
                <Label
                  key={option.months}
                  htmlFor={`plan-${option.months}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <div>
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <RadioGroupItem value={String(option.months)} id={`plan-${option.months}`} />
                </Label>
              ))}
            </RadioGroup>
            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div>
                {selectedPlan.isLifetime ? 'Пожизненный доступ' : `Оплата за ${selectedPlan.months} мес.`}
              </div>
              <div>
                {selectedPlan.isLifetime
                  ? `Эквивалент ${selectedPlan.months} месяцев PRO.`
                  : 'Оплата за весь период одной суммой.'}
              </div>
            </div>
          </div>

          <div>
            <Label>Способ оплаты</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'individual' | 'legal')} className="flex gap-3 mt-2">
              <Label htmlFor="pay-individual" className="flex-1 p-3 border rounded-md cursor-pointer hover:bg-secondary has-[:checked]:bg-secondary has-[:checked]:border-primary">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><User /> Физ. лицо (СБП)</span>
                  <RadioGroupItem value="individual" id="pay-individual" />
                </div>
              </Label>
              <Label htmlFor="pay-legal" className="flex-1 p-3 border rounded-md cursor-pointer hover:bg-secondary has-[:checked]:bg-secondary has-[:checked]:border-primary">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Building /> Юр. лицо / ИП</span>
                  <RadioGroupItem value="legal" id="pay-legal" />
                </div>
              </Label>
            </RadioGroup>
          </div>

          {paymentMethod === 'individual' ? (
            <Alert>
              <PhoneCall className="h-4 w-4" />
              <AlertTitle>Оплата переводом (СБП)</AlertTitle>
              <AlertDescription className="space-y-3">
                <div>Переведите <strong>{selectedPlan.price.toLocaleString('ru-RU')} ₽</strong> по номеру {sbpPhone}.</div>
                <div className="text-xs text-muted-foreground">Банк: {sbpBank}.</div>
                {sbpLink && (
                  <div>
                    <Button asChild variant="outline" size="sm">
                      <a href={sbpLink} target="_blank" rel="noreferrer">Открыть ссылку СБП</a>
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                  {receiptFile && <span className="text-xs text-muted-foreground">{receiptFile.name}</span>}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Проверка до 24 часов. PRO активируется на 1 день.
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Счет для юр. лица</AlertTitle>
              <AlertDescription className="space-y-3">
                <div>Счет будет сформирован и сохранен в истории документов.</div>
                {isLoadingCompanies ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка компаний...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="company-select">Организация</Label>
                    <select
                      id="company-select"
                      className="w-full border rounded-md p-2"
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                      {companies.length === 0 ? (
                        <option value="">Нет организаций</option>
                      ) : (
                        companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          {paymentMethod === 'individual' ? (
            <Button onClick={handleSubmitSbp} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Отправить чек
            </Button>
          ) : (
            <Button onClick={handleGenerateInvoice} disabled={isSubmitting || !selectedCompanyId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Сформировать счет
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

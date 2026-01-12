// src/components/PurchaseCreditsDialog.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, FileText, Building, User, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type Company } from '@/contexts/AppContext';
import { onSnapshot, query, collection, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLegalEntity, type LegalEntity } from '@/actions/adminActions';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import InvoiceTemplate from './pdf/InvoiceTemplate';
import { uploadAndGetInvoiceUri } from '@/actions/invoiceActions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { logUserAction } from '@/lib/logger';
import Link from 'next/link';


export type CreditPackage = {
    name: string;
    credits: number;
    totalPrice: number;
    pricePerCredit: number;
    discount: number;
    features: string[];
    popular: boolean;
};

interface PurchaseCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: CreditPackage;
}

function ConsentDialog({ onConfirm, onCancel, isPending }: { onConfirm: () => void, onCancel: () => void, isPending: boolean }) {
    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" />
                        Требуется ваше согласие
                    </DialogTitle>
                    <DialogDescription>
                        Для выставления счета и обработки платежа нам необходимо ваше согласие на передачу данных третьим лицам (платежным системам).
                    </DialogDescription>
                </DialogHeader>
                 <AlertDescription>
                    Вы можете в любой момент отозвать свое согласие в настройках профиля. Подробнее в <Link href="/legal/privacy-policy" target="_blank" className="underline">Политике конфиденциальности</Link>.
                </AlertDescription>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Отмена</Button>
                    <Button onClick={onConfirm} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Я согласен
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function PurchaseCreditsDialog({ isOpen, onClose, selectedPackage }: PurchaseCreditsDialogProps) {
    const { user, setUser } = useAppContext();
    const { toast } = useToast();
    
    const [paymentMethod, setPaymentMethod] = useState<'individual' | 'legal'>('individual');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isGenerating, startGenerating] = useTransition();
    const [isConsentPending, startConsentTransition] = useTransition();
    const [needsConsent, setNeedsConsent] = useState(false);


    useEffect(() => {
        if (isOpen && user && paymentMethod === 'legal') {
            setIsLoadingCompanies(true);
            const q = query(collection(db, 'companies'), where('userId', '==', user.uid));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedCompanies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
                const ownCompanies = fetchedCompanies.filter(company => !company.isClient);
                setCompanies(ownCompanies);
                const defaultCompany = ownCompanies.find(c => c.isDefault) || ownCompanies[0];
                if (defaultCompany) {
                    setSelectedCompanyId(defaultCompany.id);
                }
                setIsLoadingCompanies(false);
            }, (error) => {
                console.error("Error fetching companies:", error);
                toast({ title: "Ошибка", description: "Не удалось загрузить список ваших компаний.", variant: "destructive" });
                setIsLoadingCompanies(false);
            });
            return () => unsubscribe();
        }
    }, [isOpen, user, paymentMethod, toast]);

    const handleConfirmConsent = () => {
        if (!user) return;
        startConsentTransition(async () => {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { agreedToThirdParty: true });
            await logUserAction(user.uid, 'USER_CONSENT_THIRD_PARTY', { source: 'purchase_dialog' });
            setUser({ ...user, agreedToThirdParty: true });
            setNeedsConsent(false);
            toast({ title: "Согласие получено", description: "Теперь вы можете продолжить." });
            // Automatically trigger invoice generation after consent
            startGenerating(async () => await generateInvoice());
        });
    };

    const generateInvoice = async () => {
        const buyerCompany = companies.find(c => c.id === selectedCompanyId);
        if (!user || !buyerCompany) {
            toast({ title: "Ошибка", description: "Выберите компанию для выставления счета.", variant: "destructive" });
            return;
        }

        toast({ title: "Генерация счета...", description: "Пожалуйста, подождите." });

        try {
            const sellerCompany = await getLegalEntity();
            if (!sellerCompany) {
                throw new Error("Реквизиты продавца не настроены в системе.");
            }
            
            const invoiceNumber = `СЧ-${Date.now()}`;
            const invoiceDate = new Date();
            
            const docToRender = (
                <InvoiceTemplate
                    invoiceNumber={invoiceNumber}
                    invoiceDate={invoiceDate}
                    seller={sellerCompany}
                    buyer={buyerCompany}
                    items={[
                        {
                            name: `Пакет кредитов "${selectedPackage.name}" (${selectedPackage.credits} шт.)`,
                            quantity: 1,
                            unit: 'пак',
                            price: selectedPackage.totalPrice,
                        },
                    ]}
                />
            );

            const blob = await pdf(docToRender).toBlob();
            const fileName = `Счет_${invoiceNumber}_от_${invoiceDate.toLocaleDateString()}.pdf`;
            
            const arrayBuffer = await blob.arrayBuffer();
            const { fileUri } = await uploadAndGetInvoiceUri({
                fileArrayBuffer: arrayBuffer,
                fileName: fileName,
                fileType: blob.type,
            });

            if (!fileUri) {
                throw new Error("Не удалось получить ссылку на файл после загрузки.");
            }

            await addDoc(collection(db, 'invoices'), {
                userId: user.uid,
                invoiceNumber,
                invoiceDate: serverTimestamp(),
                buyerName: buyerCompany.name,
                totalAmount: selectedPackage.totalPrice,
                downloadUrl: fileUri,
            });

            saveAs(blob, fileName);
            toast({ title: "Успех!", description: "Счет сгенерирован, скачан и сохранен в историю." });
            onClose();

        } catch (error: any) {
            console.error("Invoice generation error:", error);
            toast({ title: "Ошибка генерации счета", description: error.message, variant: "destructive" });
        }
    };
    
    const handleGenerateInvoiceClick = () => {
        if (user && !user.agreedToThirdParty) {
            setNeedsConsent(true);
        } else {
            startGenerating(async () => await generateInvoice());
        }
    }


    const handlePayByCard = () => {
        toast({ title: "В разработке", description: "Оплата картой для физ. лиц будет доступна в ближайшее время." });
    };
    
    if (needsConsent) {
        return <ConsentDialog onConfirm={handleConfirmConsent} onCancel={() => setNeedsConsent(false)} isPending={isConsentPending} />;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Покупка пакета "{selectedPackage.name}"</DialogTitle>
                    <DialogDescription>
                        Вы покупаете {selectedPackage.credits} кредитов за {selectedPackage.totalPrice.toLocaleString('ru-RU')} ₽.
                        Выберите способ оплаты.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <Label>Способ оплаты:</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="flex gap-4">
                        <Label htmlFor="pay-individual" className="flex-1 p-4 border rounded-md cursor-pointer hover:bg-secondary has-[:checked]:bg-secondary has-[:checked]:border-primary">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><User /> Физ. лицо</span>
                                <RadioGroupItem value="individual" id="pay-individual" />
                            </div>
                        </Label>
                         <Label htmlFor="pay-legal" className="flex-1 p-4 border rounded-md cursor-pointer hover:bg-secondary has-[:checked]:bg-secondary has-[:checked]:border-primary">
                            <div className="flex items-center justify-between">
                                 <span className="flex items-center gap-2"><Building /> Юр. лицо / ИП</span>
                                <RadioGroupItem value="legal" id="pay-legal" />
                            </div>
                        </Label>
                    </RadioGroup>

                    {paymentMethod === 'legal' && (
                        <div className="mt-4 space-y-2">
                            <Label htmlFor="company-select">Выберите организацию</Label>
                            {isLoadingCompanies ? <Loader2 className="animate-spin" /> : (
                                companies.length > 0 ? (
                                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                        <SelectTrigger id="company-select">
                                            <SelectValue placeholder="Выберите из списка..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-muted-foreground">У вас нет добавленных компаний. Добавьте их в профиле.</p>
                                )
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>Отмена</Button>
                    {paymentMethod === 'individual' && (
                        <Button onClick={handlePayByCard}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Оплатить картой (скоро)
                        </Button>
                    )}
                    {paymentMethod === 'legal' && (
                        <Button onClick={handleGenerateInvoiceClick} disabled={isLoadingCompanies || companies.length === 0 || isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4" />}
                            Сформировать счет
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

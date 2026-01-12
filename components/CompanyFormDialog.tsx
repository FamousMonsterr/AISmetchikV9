// src/components/CompanyFormDialog.tsx
"use client";

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, type Company } from '@/contexts/AppContext';
import { addCompany, updateCompany, suggestCompanyDetails, DadataSuggestion } from '@/actions/companyActions';
import { debounce } from 'lodash';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Search } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company?: Company | null;
  isClientForm?: boolean;
}

const FormSchema = z.object({
    name: z.string().min(2, "Название/ФИО должно содержать не менее 2 символов.").max(100),
    type: z.enum(['LLC', 'IE', 'SelfEmployed'], { required_error: "Выберите тип компании" }),
    taxSystem: z.enum(['none', 'vat_included', 'vat_added', 'usn'], { required_error: "Выберите систему налогообложения" }),
    
    fullName: z.string().max(255).optional(),
    inn: z.string().optional(),
    kpp: z.string().optional(),
    ogrn: z.string().optional(),
    legalAddress: z.string().optional(),
    postalAddress: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email({ message: "Неверный формат email." }).optional().or(z.literal('')),
    bankName: z.string().optional(),
    bik: z.string().optional(),
    correspondentAccount: z.string().optional(),
    checkingAccount: z.string().optional(),
    ceoName: z.string().optional(),
    ceoBasis: z.string().optional(),
}).refine(data => !data.inn || /^\d{10}$|^\d{12}$/.test(data.inn), {
    message: "ИНН должен состоять из 10 или 12 цифр.",
    path: ["inn"],
}).refine(data => !data.kpp || /^\d{9}$/.test(data.kpp), {
    message: "КПП должен состоять из 9 цифр.",
    path: ["kpp"],
}).refine(data => !data.ogrn || /^\d{13}$|^\d{15}$/.test(data.ogrn), {
    message: "ОГРН/ОГРНИП должен состоять из 13 или 15 цифр.",
    path: ["ogrn"],
}).refine(data => !data.bik || /^\d{9}$/.test(data.bik), {
    message: "БИК должен состоять из 9 цифр.",
    path: ["bik"],
}).refine(data => !data.correspondentAccount || /^\d{20}$/.test(data.correspondentAccount), {
    message: "Корр. счет должен состоять из 20 цифр.",
    path: ["correspondentAccount"],
}).refine(data => !data.checkingAccount || /^\d{20}$/.test(data.checkingAccount), {
    message: "Расчетный счет должен состоять из 20 цифр.",
    path: ["checkingAccount"],
});


export function CompanyFormDialog({ isOpen, onClose, onSuccess, company, isClientForm }: CompanyFormDialogProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!company;
  const isClientValue = company?.isClient ?? isClientForm ?? false;
  const [createForClient, setCreateForClient] = useState(isClientForm ?? true);
  const [createForOwn, setCreateForOwn] = useState(!(isClientForm ?? true));
  
  const [dadataQuery, setDadataQuery] = useState('');
  const [dadataSuggestions, setDadataSuggestions] = useState<DadataSuggestion[]>([]);
  const [isDadataLoading, setIsDadataLoading] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || isEditMode) return;
    const isClientDefault = isClientForm ?? true;
    setCreateForClient(isClientDefault);
    setCreateForOwn(!isClientDefault);
  }, [isOpen, isEditMode, isClientForm]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: company?.name || '',
      type: company?.type || 'LLC',
      taxSystem: company?.taxSystem || 'vat_included',
      fullName: company?.fullName || '',
      inn: company?.inn || '',
      kpp: company?.kpp || '',
      ogrn: company?.ogrn || '',
      legalAddress: company?.legalAddress || '',
      postalAddress: company?.postalAddress || '',
      phone: company?.phone || '',
      email: company?.email || '',
      bankName: company?.bankName || '',
      bik: company?.bik || '',
      correspondentAccount: company?.correspondentAccount || '',
      checkingAccount: company?.checkingAccount || '',
      ceoName: company?.ceoName || '',
      ceoBasis: company?.ceoBasis || (company?.type === 'LLC' ? 'Устава' : 'Свидетельства о гос. регистрации'),
    },
  });
  
  const companyType = form.watch('type');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!/^\d{10,12}$/.test(query)) {
        setDadataSuggestions([]);
        setIsSuggestionsOpen(false);
        return;
      }
      setIsDadataLoading(true);
      const result = await suggestCompanyDetails(query);
      if (result.success && result.suggestions) {
        setDadataSuggestions(result.suggestions);
        setIsSuggestionsOpen(true);
      } else {
        setDadataSuggestions([]);
        setIsSuggestionsOpen(false);
      }
      setIsDadataLoading(false);
    }, 500),
    []
  );

  const handleDadataQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setDadataQuery(query);
    debouncedSearch(query);
  };
  
  const handleSuggestionSelect = (suggestion: DadataSuggestion) => {
    const { data } = suggestion;
    form.reset({
      ...form.getValues(), // keep existing values like taxSystem
      name: data.name.short_with_opf || suggestion.value,
      fullName: data.name.full_with_opf || suggestion.value,
      inn: data.inn || '',
      kpp: data.kpp || '',
      ogrn: data.ogrn || '',
      legalAddress: data.address?.value || '',
      postalAddress: data.address?.value || '',
      ceoName: data.management?.name || '',
      ceoBasis: 'Устава', // Default, user can change
    });
    setDadataQuery(suggestion.value);
    setIsSuggestionsOpen(false);
  };


  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    if (!user) {
        toast({ title: "Ошибка", description: "Необходимо авторизоваться.", variant: "destructive"});
        return;
    }

    startTransition(async () => {
        let result;
        if (isEditMode) {
            result = await updateCompany(company.id, { ...values, isClient: isClientValue });
        } else {
            if (!createForClient && !createForOwn) {
                toast({ title: "Выберите группу", description: "Нужно выбрать хотя бы одну группу для добавления.", variant: "destructive" });
                return;
            }
            const targets: boolean[] = [];
            if (createForClient) targets.push(true);
            if (createForOwn) targets.push(false);

            const results = [];
            for (const targetIsClient of targets) {
                const newCompanyData = { ...values, userId: user.uid, isDefault: false, isClient: targetIsClient };
                // eslint-disable-next-line no-await-in-loop
                results.push(await addCompany(newCompanyData));
            }

            const failures = results.filter((entry) => !entry.success);
            const successCount = results.length - failures.length;
            if (failures.length === 0) {
                result = { success: true, message: targets.length > 1 ? 'Компании успешно добавлены.' : results[0]?.message || 'Компания успешно добавлена.' };
            } else if (successCount > 0) {
                result = { success: true, message: `Добавлено: ${successCount} из ${targets.length}. ${failures[0]?.message || ''}`.trim() };
            } else {
                result = failures[0];
            }
        }

        if (result.success) {
            const isPartial = !isEditMode && result.message.includes('Добавлено:');
            toast({
              title: isPartial ? "Частично добавлено" : "Успех!",
              description: result.message,
              variant: isPartial ? "destructive" : undefined,
            });
            onSuccess();
        } else {
            toast({ title: "Ошибка", description: result.message, variant: "destructive" });
        }
    });
  };
  
  const renderFormField = (name: keyof z.infer<typeof FormSchema>, label: string, placeholder: string = '', description?: string) => (
      <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
              <FormItem>
                <LabelInputContainer>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                      <Input placeholder={placeholder} {...field} value={field.value || ''} />
                  </FormControl>
                  {description && <FormDescription>{description}</FormDescription>}
                  <FormMessage />
                </LabelInputContainer>
              </FormItem>
          )}
      />
  );
  
  const nameLabel = companyType === 'LLC' ? "Краткое наименование" : "ФИО";
  const fullNameLabel = companyType === 'LLC' ? "Полное наименование" : "Полное наименование (например, Индивидуальный предприниматель...)";
  const ceoNameLabel = companyType === 'LLC' ? "ФИО руководителя" : "ФИО";
  const ceoBasisLabel = companyType === 'LLC' ? "Действует на основании" : "Действует на основании";
  const groupLabel = isEditMode
    ? (isClientValue ? 'Контрагенты' : 'Мои компании')
    : (createForClient && createForOwn ? 'Контрагенты + Мои компании' : createForClient ? 'Контрагенты' : createForOwn ? 'Мои компании' : 'Не выбрано');


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? isClientValue ? 'Редактировать контрагента' : 'Редактировать мою компанию'
              : createForClient && createForOwn
                ? 'Добавить компании'
                : createForClient ? 'Добавить контрагента' : 'Добавить мою компанию'}
          </DialogTitle>
          <DialogDescription>
            Начните вводить ИНН для автозаполнения, или заполните поля вручную.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-1 pr-4">
                <div className="space-y-4">
                    {!isEditMode && (
                      <div className="space-y-2">
                        <Label>Добавить в группу</Label>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <Checkbox checked={createForClient} onCheckedChange={(checked) => setCreateForClient(Boolean(checked))} />
                            Контрагент
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox checked={createForOwn} onCheckedChange={(checked) => setCreateForOwn(Boolean(checked))} />
                            Моя компания
                          </label>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Выбрано: {groupLabel}
                        </div>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="text-xs text-muted-foreground">
                        Группа: {groupLabel}
                      </div>
                    )}

                    <Popover open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <LabelInputContainer>
                            <FormLabel>Поиск по ИНН (DaData)</FormLabel>
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                               <Input
                                  placeholder="Введите ИНН (10 или 12 цифр)..."
                                  value={dadataQuery}
                                  onChange={handleDadataQueryChange}
                                  className="pl-10"
                                />
                               {isDadataLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                          </LabelInputContainer>
                        </div>
                      </PopoverTrigger>
                       <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <AnimatePresence>
                          {dadataSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <div className="flex flex-col gap-1 p-1">
                                {dadataSuggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSuggestionSelect(s)}
                                    className="text-left p-2 rounded-md hover:bg-secondary w-full"
                                  >
                                    <p className="font-medium text-sm">{s.value}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {s.data.inn}
                                      {s.data.address && ` • ${s.data.address.value}`}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </PopoverContent>
                    </Popover>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Форма собственности</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="LLC" /></FormControl>
                                <FormLabel className="font-normal">ООО / АО</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="IE" /></FormControl>
                                <FormLabel className="font-normal">ИП</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="SelfEmployed" /></FormControl>
                                <FormLabel className="font-normal">Самозанятый</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    {renderFormField("name", nameLabel, companyType === 'LLC' ? 'ООО "Ромашка"' : "Иванов Иван Иванович")}
                    {renderFormField("fullName", fullNameLabel)}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderFormField("inn", "ИНН")}
                        {companyType === 'LLC' && renderFormField("kpp", "КПП")}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderFormField("ogrn", companyType === 'LLC' ? "ОГРН" : "ОГРНИП")}
                        {renderFormField("phone", "Контактный телефон")}
                    </div>

                    {renderFormField("legalAddress", "Юридический адрес")}
                    {renderFormField("postalAddress", "Почтовый адрес (если отличается)")}
                    {renderFormField("email", "Email для документов", "docs@example.com")}

                    <FormField
                        control={form.control}
                        name="taxSystem"
                        render={({ field }) => (
                        <FormItem>
                          <LabelInputContainer>
                            <FormLabel>Система налогообложения</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Выберите систему..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">Без налога</SelectItem>
                                    <SelectItem value="vat_included">НДС в т.ч. (20%)</SelectItem>
                                    <SelectItem value="vat_added">НДС сверху (20%)</SelectItem>
                                    <SelectItem value="usn">УСН / НПД (6%)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>Будет использоваться по умолчанию для новых расчетов.</FormDescription>
                            <FormMessage />
                            </LabelInputContainer>
                        </FormItem>
                        )}
                    />
                   
                    <Separator />
                    <h3 className="text-lg font-semibold pt-4">Банковские реквизиты (необязательно)</h3>
                    {renderFormField("bankName", "Наименование банка")}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderFormField("bik", "БИК")}
                        {renderFormField("correspondentAccount", "Корр. счет")}
                    </div>
                    {renderFormField("checkingAccount", "Расчетный счет")}
                    
                    <Separator />
                    {companyType === 'LLC' && (
                         <>
                            <h3 className="text-lg font-semibold pt-4">Руководитель</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderFormField("ceoName", ceoNameLabel, "Иванов Иван Иванович")}
                                {renderFormField("ceoBasis", ceoBasisLabel, "Устава")}
                            </div>
                         </>
                    )}

                </div>
            </ScrollArea>
             <DialogFooter className="pt-6">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
                <button
                  className="group/btn relative inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-br from-black to-neutral-600 px-4 py-2 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
                  type="submit"
                  disabled={isPending}
                >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditMode ? 'Сохранить изменения' : 'Добавить компанию'}
                    <BottomGradient />
                </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

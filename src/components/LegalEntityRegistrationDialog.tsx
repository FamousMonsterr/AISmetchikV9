// src/components/LegalEntityRegistrationDialog.tsx
// @ts-nocheck
"use client";

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Building, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { suggestCompanyDetails, addCompany, type DadataSuggestion } from '@/actions/companyActions';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from '@/lib/motion';
import { submitHighTierApplication } from '@/actions/partnerActions';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { resolvePostAuthRedirectUrl } from '@/lib/navigation';

const createFormSchema = (isPartner: boolean) => z.object({
  companyName: z.string().min(2, "Название компании обязательно."),
  inn: z.string().optional(),
  contactName: z.string().min(2, "Имя контактного лица обязательно."),
  email: z.string().email("Неверный формат email."),
  phone: z.string().min(5, "Телефон обязателен."),
  country: z.string().nonempty({ message: "Необходимо выбрать страну." }),
  wantsDemo: z.boolean().default(false),
  demoDate: z.date().optional(),
  demoTime: z.string().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, { message: "Необходимо принять условия." }),
  agreedToPrivacy: z.boolean().refine(val => val === true, { message: "Необходимо принять условия." }),
  agreedToPartnerTerms: z.boolean().optional().refine(val => !isPartner || val === true, {
    message: "Для регистрации партнера необходимо принять условия партнерского соглашения.",
  }),
});


export function LegalEntityRegistrationDialog({ isOpen, onClose, isRegistration = false, isPartnerRegistration = false }: { isOpen: boolean; onClose: () => void; isRegistration?: boolean, isPartnerRegistration?: boolean }) {
  const { toast } = useToast();
  const { user, setNavigating } = useAppContext();
  const [isPending, startTransition] = useTransition();

  const [dadataQuery, setDadataQuery] = useState('');
  const [dadataSuggestions, setDadataSuggestions] = useState<DadataSuggestion[]>([]);
  const [isDadataLoading, setIsDadataLoading] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<DadataSuggestion | null>(null);
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const FormSchema = createFormSchema(isPartnerRegistration);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      wantsDemo: false,
      agreedToPrivacy: false,
      agreedToTerms: false,
      agreedToPartnerTerms: false,
      country: 'Russia',
    },
  });

  const wantsDemo = form.watch('wantsDemo');
  const selectedDate = form.watch('demoDate');
  
  const isWeekday = selectedDate ? (selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6) : false;
  const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!/^\d{10,12}$/.test(query)) {
        setDadataSuggestions([]);
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
    const query = e.target.value.trim();
    setDadataQuery(query);
    debouncedSearch(query);
  };
  
  const handleSuggestionSelect = (suggestion: DadataSuggestion) => {
    setSelectedCompany(suggestion);
    form.setValue('companyName', suggestion.value, { shouldValidate: true });
    form.setValue('inn', suggestion.data.inn || '', { shouldValidate: true });
    setIsSuggestionsOpen(false);
    setDadataQuery(suggestion.value);
  };
  
  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
        const result = { success: true, message: 'Ваша заявка принята! Наш менеджер свяжется с вами в ближайшее время.' };
        
        if (selectedCompany && user) {
            const companyData = {
                userId: user.uid,
                isDefault: true,
                name: selectedCompany.data.name.short_with_opf || selectedCompany.value,
                type: (selectedCompany.data.ogrn?.length === 13) ? 'LLC' : 'IE',
                taxSystem: 'usn', 
                fullName: selectedCompany.data.name.full_with_opf || selectedCompany.value,
                inn: selectedCompany.data.inn || '',
                kpp: selectedCompany.data.kpp || '',
                ogrn: selectedCompany.data.ogrn || '',
                legalAddress: selectedCompany.data.address?.value || '',
                ceoName: selectedCompany.data.management?.name || '',
            };
            await addCompany(companyData);
        }

        if (result.success) {
            toast({
                title: "Заявка отправлена!",
                description: result.message,
            });
            if (isRegistration) {
              setNavigating(true);
              window.location.replace(resolvePostAuthRedirectUrl(undefined, isPartnerRegistration ? 'partner' : undefined));
            }
            onClose();
        } else {
             toast({
                title: "Ошибка",
                description: result.message,
                variant: "destructive"
            });
        }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isPartnerRegistration ? 'Заявка на партнерство' : 'Заявка для юридических лиц'}</DialogTitle>
          <DialogDescription>
            {isPartnerRegistration 
                ? 'Короткая заявка — ответим быстро.'
                : 'Короткая заявка — пришлем условия.'
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Popover open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                       <LabelInputContainer>
                            <FormLabel>ИНН компании</FormLabel>
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
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <AnimatePresence>
                    {dadataSuggestions.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {dadataSuggestions.map((s, i) => (
                                <button key={i} type="button" onClick={() => handleSuggestionSelect(s)} className="text-left p-2 rounded-md hover:bg-secondary w-full">
                                    <p className="font-medium text-sm">{s.value}</p>
                                    <p className="text-xs text-muted-foreground">{s.data.inn}</p>
                                </button>
                            ))}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </PopoverContent>
            </Popover>

            {selectedCompany && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="p-3 border rounded-lg bg-secondary/50 space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success"/>Выбрана компания:</p>
                        <p className="font-bold">{selectedCompany.value}</p>
                        <p className="text-xs text-muted-foreground">ИНН: {selectedCompany.data.inn}</p>
                        <p className="text-xs text-muted-foreground">Адрес: {selectedCompany.data.address?.value}</p>
                    </div>
                </motion.div>
            )}

            <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><LabelInputContainer><FormLabel>Контактное лицо (ФИО)</FormLabel><Input {...field} /><FormMessage /></LabelInputContainer></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><LabelInputContainer><FormLabel>Email</FormLabel><Input type="email" {...field} /><FormMessage /></LabelInputContainer></FormItem>)} />
            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><LabelInputContainer><FormLabel>Телефон</FormLabel><Input type="tel" {...field} /><FormMessage /></LabelInputContainer></FormItem>)} />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <LabelInputContainer>
                    <FormLabel>Страна</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Russia">Россия</SelectItem>
                        <SelectItem value="Other">Другая страна</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                        Работа в других странах доступна только для Платиновых партнеров.
                    </FormDescription>
                    <FormMessage />
                  </LabelInputContainer>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="wantsDemo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Мне нужна демонстрация продукта</FormLabel>
                    <FormDescription>Наш специалист покажет все возможности сервиса.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <AnimatePresence>
                {wantsDemo && (
                    <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="demoDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Дата</FormLabel>
                                <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                  <DialogTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                  </DialogTrigger>
                                  <DialogContent className="w-auto">
                                      <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setIsCalendarOpen(false);
                                        }} 
                                        disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6} 
                                        initialFocus />
                                  </DialogContent>
                                </Dialog>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        {selectedDate && isWeekday && (
                           <div className="space-y-2">
                            <Label>Время (МСК)</Label>
                             <FormField
                                control={form.control}
                                name="demoTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-4 gap-2">
                                            {timeSlots.map(slot => (
                                                <FormItem key={slot}>
                                                    <FormControl>
                                                        <RadioGroupItem value={slot} id={`slot-${slot}`} className="sr-only peer" />
                                                    </FormControl>
                                                    <Label htmlFor={`slot-${slot}`} className="flex items-center justify-center p-2 text-sm rounded-md border cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 hover:bg-secondary/50">
                                                        {slot}
                                                    </Label>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                           </div>
                        )}
                        {selectedDate && !isWeekday && (
                             <p className="text-sm text-destructive">Демонстрации проводятся только по будням.</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="pt-4 space-y-2">
              <FormField control={form.control} name="agreedToPrivacy" render={({ field }) => (<FormItem className="flex items-center space-x-2"><Checkbox checked={field.value} onCheckedChange={field.onChange} id="legal-privacy-corp" /><label htmlFor="legal-privacy-corp" className="text-xs text-muted-foreground">Я согласен с <a href="/legal/privacy-policy" target="_blank" className="underline">Политикой обработки ПДн</a></label><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="agreedToTerms" render={({ field }) => (<FormItem className="flex items-center space-x-2"><Checkbox checked={field.value} onCheckedChange={field.onChange} id="legal-terms-corp" /><label htmlFor="legal-terms-corp" className="text-xs text-muted-foreground">Я даю <a href="/legal/consent" target="_blank" className="underline">согласие на обработку ПДн</a></label><FormMessage /></FormItem>)} />
               {isPartnerRegistration && (
                <FormField control={form.control} name="agreedToPartnerTerms" render={({ field }) => (<FormItem className="flex items-center space-x-2"><Checkbox checked={field.value} onCheckedChange={field.onChange} id="legal-partner-corp" /><label htmlFor="legal-partner-corp" className="text-xs text-muted-foreground">Я принимаю условия <Link href="/legal/license" className="underline">Партнерского соглашения</Link></label><FormMessage /></FormItem>)} />
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отправить заявку
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


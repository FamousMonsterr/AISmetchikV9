// src/components/admin/LegalEntitySettings.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Building } from "lucide-react";
import { getLegalEntity, updateLegalEntity } from '@/actions/adminActions';
import { LegalEntitySchema, type LegalEntity } from '@/ai/genkit-schemas';
import { useAppContext } from '@/contexts/AppContext';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';

export function LegalEntitySettings() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LegalEntity>({
    resolver: zodResolver(LegalEntitySchema),
    defaultValues: {
        name: '',
        legalAddress: '',
        inn: '',
        kpp: '',
        checkingAccount: '',
        bankName: '',
        correspondentAccount: '',
        bik: '',
        ceoName: '',
        contactPhone: '',
        contactEmail: '',
    },
  });

  useEffect(() => {
    if (!user || user.systemRole !== 'Super Admin') {
        setIsLoading(false);
        return;
    }
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const currentSettings = await getLegalEntity();
        if (currentSettings) {
          form.reset(currentSettings);
        }
      } catch (error) {
        console.error("Error loading legal entity:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast, form, user]);

  const onSubmit = (values: LegalEntity) => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startTransition(async () => {
      const result = await updateLegalEntity(user.uid, values);
      if (result.success) {
        toast({ title: "Успешно", description: result.message });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };
  
  if (isLoading) {
    return (
       <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  const renderFormField = (name: keyof LegalEntity, label: string) => (
      <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
            <LabelInputContainer>
              <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
              </FormItem>
            </LabelInputContainer>
          )}
      />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building />Реквизиты юр. лица</CardTitle>
        <CardDescription>Эти данные будут использоваться в договорах-офертах и счетах на оплату.</CardDescription>
      </CardHeader>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('name', 'Название организации / ФИО ИП')}
                    {renderFormField('ceoName', 'ФИО руководителя')}
                    {renderFormField('inn', 'ИНН')}
                    {renderFormField('kpp', 'КПП (если есть)')}
                    {renderFormField('legalAddress', 'Юридический адрес')}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('bankName', 'Наименование банка')}
                    {renderFormField('bik', 'БИК')}
                    {renderFormField('checkingAccount', 'Расчетный счет')}
                    {renderFormField('correspondentAccount', 'Корр. счет')}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('contactPhone', 'Контактный телефон')}
                    {renderFormField('contactEmail', 'Контактный Email')}
                 </div>
          </CardContent>
          <CardFooter>
             <button
                className="group/btn relative inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-br from-black to-neutral-600 px-4 py-2 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
                type="submit"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Сохранить реквизиты
                <BottomGradient />
            </button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

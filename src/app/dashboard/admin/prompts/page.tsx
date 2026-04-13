// src/app/dashboard/admin/prompts/page.tsx
"use client";

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Code, Lock } from "lucide-react";
import { getPrompts, updatePrompts, type Prompt } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

function PromptsPageContent() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const defaultOpenPrompt = searchParams.get('prompt');

  useEffect(() => {
    if (!user || user.systemRole !== 'Super Admin') return;
    const fetchPrompts = async () => {
      setIsLoading(true);
      try {
        const currentPrompts = await getPrompts();
        setPrompts(currentPrompts);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить текущие промпты.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, [user, toast]);
  
  const handlePromptChange = (id: string, newText: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, promptText: newText } : p));
  };

  const handleSave = () => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startTransition(async () => {
      const result = await updatePrompts(user.uid, prompts);
      if (result.success) {
        toast({
          title: "Успешно",
          description: result.message,
        });
      } else {
        toast({
          title: "Ошибка",
          description: result.message,
          variant: "destructive",
        });
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

  const renderPromptAccordion = (promptEntries: Prompt[]) => (
     <Accordion type="multiple" className="w-full space-y-4" defaultValue={defaultOpenPrompt ? [defaultOpenPrompt] : []}>
        {promptEntries.map((prompt) => {
            const allowedRoles = prompt.allowedRoles || [];
            const canEdit = user && allowedRoles.includes(user.systemRole);

            return (
                <AccordionItem value={prompt.id} key={prompt.id} className="border rounded-md">
                    <AccordionTrigger className="px-4 py-2 hover:no-underline">
                        <div className="text-left flex items-start gap-3 w-full">
                            <Code className="h-5 w-5 mt-1 text-muted-foreground"/>
                            <div className="flex-grow">
                                <h3 className="font-semibold">{prompt.name}</h3>
                                <p className="text-sm text-muted-foreground">{prompt.description}</p>
                            </div>
                             <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                {allowedRoles.map((role: string) => <Badge key={role} variant="secondary">{role}</Badge>)}
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                        {canEdit ? (
                            <Textarea
                                value={prompt.promptText}
                                onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                                className="min-h-[300px] font-mono text-xs"
                                disabled={isPending}
                            />
                        ) : (
                            <div className="p-4 bg-muted/50 rounded-md text-muted-foreground flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                <span>У вас нет прав для редактирования этого промпта.</span>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            )
        })}
    </Accordion>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управление AI промптами</CardTitle>
        <CardDescription>Редактирование системных промптов, которые используются для анализа и других AI-функций.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderPromptAccordion(prompts)}
      </CardContent>
      <CardFooter>
          <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить все промпты
          </Button>
      </CardFooter>
    </Card>
  );
}


export default function AdminPromptsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PromptsPageContent />
        </Suspense>
    )
}

// src/app/dashboard/admin/sections/page.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Library, PlusCircle, Trash2, Tag, X } from "lucide-react";
import { getStandardSections, updateStandardSections, type StandardSection } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { nanoid } from 'nanoid';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminSectionsPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [sections, setSections] = useState<StandardSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user || user.systemRole !== 'Super Admin') {
      setIsLoading(false);
      return;
    }
    const fetchSections = async () => {
      setIsLoading(true);
      try {
        const currentSections = await getStandardSections();
        setSections(currentSections);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить стандартные разделы.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSections();
  }, [toast, user]);

  const handleUpdate = <K extends keyof StandardSection>(id: string, key: K, value: StandardSection[K]) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
  };
  
  const handleAddHashtag = (sectionId: string, newHashtag: string) => {
    if (!newHashtag || !newHashtag.startsWith('#')) {
        toast({ title: "Ошибка", description: "Хештег должен начинаться с символа #", variant: "destructive" });
        return;
    }
    setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, hashtags: [...s.hashtags, newHashtag.trim()] } : s
    ));
  };

  const handleRemoveHashtag = (sectionId: string, hashtagToRemove: string) => {
     setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, hashtags: s.hashtags.filter(h => h !== hashtagToRemove) } : s
    ));
  };

  const handleAddNewSection = () => {
    const newSection: StandardSection = {
        id: nanoid(),
        section: 'Новый раздел',
        hashtags: ['#новый_раздел'],
    };
    setSections(prev => [newSection, ...prev]);
  }
  
  const handleDeleteSection = (idToDelete: string) => {
      setSections(prev => prev.filter(s => s.id !== idToDelete));
  }


  const handleSave = () => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startTransition(async () => {
      const result = await updateStandardSections(user.uid, sections);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Стандартные разделы и хештеги</CardTitle>
        <CardDescription>Управление разделами для классификации проектов и автоматического подбора цен. Эти хештеги передаются AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAddNewSection}><PlusCircle className="mr-2 h-4 w-4" />Добавить раздел</Button>
         <Accordion type="multiple" className="w-full space-y-4">
            {sections.map((sec, index) => (
                <AccordionItem value={sec.id} key={sec.id} className="border rounded-md">
                    <AccordionTrigger className="px-4 py-2 hover:no-underline">
                        <div className="text-left flex items-start gap-3 w-full">
                            <Library className="h-5 w-5 mt-1 text-muted-foreground"/>
                            <div className="flex-grow">
                                <Input 
                                    value={sec.section}
                                    onChange={(e) => handleUpdate(sec.id, 'section', e.target.value)}
                                    className="text-base font-semibold border-none focus-visible:ring-0 shadow-none p-0 h-auto bg-transparent"
                                    onClick={e => e.stopPropagation()}
                                />
                                <p className="text-sm text-muted-foreground">{sec.hashtags.length} хештегов</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                        <AlertDialogDescription>Вы хотите удалить раздел "{sec.section}"? Это действие нельзя будет отменить.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive" onClick={() => handleDeleteSection(sec.id)}>Удалить</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                         <div className="space-y-2">
                            <Label>Хештеги</Label>
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                                {sec.hashtags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-base">
                                        {tag}
                                        <button onClick={() => handleRemoveHashtag(sec.id, tag)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5">
                                            <X className="h-3 w-3"/>
                                        </button>
                                    </Badge>
                                ))}
                                {sec.hashtags.length === 0 && <p className="text-sm text-muted-foreground">Хештегов нет.</p>}
                            </div>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Новый хештег (напр., #видео)"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddHashtag(sec.id, e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                         </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>

      </CardContent>
      <CardFooter>
          <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить все изменения
          </Button>
      </CardFooter>
    </Card>
  );
}

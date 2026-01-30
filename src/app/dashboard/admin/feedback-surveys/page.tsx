// src/app/dashboard/admin/feedback-surveys/page.tsx
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, MessageSquareQuote, Edit, Trash2, CheckCircle, Radio, Type } from 'lucide-react';
import { getSurveys, createOrUpdateSurvey, deleteSurvey, type Survey } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { nanoid } from 'nanoid';
import { Switch } from '@/components/ui/switch';


const SurveyFormDialog = ({
  isOpen,
  onClose,
  onSuccess,
  survey
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  survey: Partial<Survey> | null;
}) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<Survey['questions']>([]);

  useEffect(() => {
    if (survey) {
      setTitle(survey.title || '');
      setDescription(survey.description || '');
      setIsActive(survey.isActive !== false);
      setQuestions(survey.questions || []);
    } else {
      setTitle('');
      setDescription('');
      setIsActive(true);
      setQuestions([]);
    }
  }, [survey]);

  const handleSave = async () => {
    if (!user) return;
    setIsPending(true);
    const surveyData = { title, description, isActive, questions };
    const result = await createOrUpdateSurvey(user.uid, surveyData, survey?.id);
    if (result.success) {
      toast({ title: 'Успех', description: result.message });
      onSuccess();
    } else {
      toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
    }
    setIsPending(false);
  };

  const addQuestion = (type: 'rating' | 'choice' | 'text') => {
    setQuestions(prev => [...prev, { id: nanoid(), text: '', type, options: type === 'choice' ? [''] : undefined }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{survey?.id ? 'Редактировать опрос' : 'Создать новый опрос'}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input placeholder="Заголовок опроса" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Описание опроса" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex items-center space-x-2">
            <Switch id="survey-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="survey-active">Активный (будет показываться пользователям)</Label>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Вопросы</h4>
            {questions.map((q, index) => (
              <Card key={q.id} className="p-4">
                {/* ... question form elements ... */}
              </Card>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addQuestion('rating')}><CheckCircle className="mr-2 h-4 w-4"/>Рейтинг</Button>
              <Button variant="outline" size="sm" onClick={() => addQuestion('choice')}><Radio className="mr-2 h-4 w-4"/>Выбор</Button>
              <Button variant="outline" size="sm" onClick={() => addQuestion('text')}><Type className="mr-2 h-4 w-4"/>Текст</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={isPending}>Отмена</Button></DialogClose>
          <Button onClick={handleSave} disabled={isPending || !title}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function FeedbackSurveysPage() {
    const { toast } = useToast();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

    const fetchSurveys = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSurveys();
            setSurveys(data);
        } catch (error: any) {
            toast({ title: "Ошибка", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]);

    const handleOpenDialog = (survey?: Survey) => {
        setSelectedSurvey(survey || null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (surveyId: string) => {
        const result = await deleteSurvey(surveyId);
        if (result.success) {
            toast({ title: 'Удалено', description: result.message });
            fetchSurveys();
        } else {
            toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Управление опросами</span>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Создать опрос
                        </Button>
                    </CardTitle>
                    <CardDescription>Создавайте и редактируйте опросы для сбора обратной связи от пользователей.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : surveys.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                            <MessageSquareQuote className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Опросов пока нет</h3>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {surveys.map(survey => (
                                <Card key={survey.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>{survey.title}</span>
                                            <Badge variant={survey.isActive ? 'secondary' : 'outline'}>{survey.isActive ? 'Активен' : 'Неактивен'}</Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            {survey.questions.length} вопрос(а) | Обновлен: {survey.updatedAt?.toDate ? format(survey.updatedAt.toDate(), 'd MMM yyyy', { locale: ru }) : 'N/A'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(survey)}>
                                            <Edit className="mr-2 h-4 w-4"/>Редактировать
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Удалить</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                    <AlertDialogDescription>Это действие нельзя отменить. Опрос "{survey.title}" будет удален.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(survey.id)} className="bg-destructive">Удалить</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <SurveyFormDialog 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                onSuccess={() => { setIsDialogOpen(false); fetchSurveys(); }}
                survey={selectedSurvey}
            />
        </>
    );
}

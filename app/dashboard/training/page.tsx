// src/app/dashboard/training/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, AlertTriangle, PlayCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';
import { getKnowledgeBaseArticles, KnowledgeBaseArticle } from '@/actions/adminActions';
import { onSnapshot, collection, query, orderBy } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const KnowledgeBaseVideo = ({ title, description, videoUrl }: { title: string, description: string, videoUrl: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full rounded-lg overflow-hidden border">
                    <iframe
                        width="100%"
                        height="100%"
                        src={videoUrl}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TrainingPage() {
  const { user } = useAppContext();
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isEditor = user?.isEditor || user?.systemRole === 'Super Admin';

  useEffect(() => {
    const q = query(collection(db, 'knowledge_base_articles'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedArticles: KnowledgeBaseArticle[] = [];
        snapshot.forEach(doc => {
            fetchedArticles.push({ id: doc.id, ...doc.data() } as KnowledgeBaseArticle);
        });
        setArticles(fetchedArticles);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BookOpen /> База знаний и обучение</CardTitle>
              <CardDescription>
                Изучите материалы, чтобы максимально эффективно использовать все возможности EstimateAI и повысить свой партнерский статус.
              </CardDescription>
            </div>
             {isEditor && (
                <Button variant="outline" disabled>
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                </Button>
            )}
        </CardHeader>
        <CardContent>
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Путь к статусу "Серебряный партнер"</AlertTitle>
                <AlertDescription>
                    Для получения статуса "Серебряный партнер" необходимо изучить все материалы в этой базе знаний и успешно сдать итоговый экзамен.
                    <div className="mt-4">
                        <Button disabled>Начать экзамен (неактивно)</Button>
                    </div>
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                       <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full aspect-video" />
                    </CardContent>
                </Card>
            ))
          ) : (
             articles.map(article => (
                <KnowledgeBaseVideo
                    key={article.id}
                    title={article.title}
                    description={article.description}
                    videoUrl={article.videoUrl}
                />
            ))
          )}
      </div>

    </div>
  );
}

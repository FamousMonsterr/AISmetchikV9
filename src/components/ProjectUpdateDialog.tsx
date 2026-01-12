// src/components/ProjectUpdateDialog.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useAppContext, type HistoryRequest } from '@/contexts/AppContext';
import { onSnapshot, collection, query, where, orderBy, FirebaseError, getDocs } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ProjectUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (projectId: string) => void;
  currentProject: HistoryRequest | null;
  dialogTitle: string;
  dialogDescription: string;
}

export function ProjectUpdateDialog({ 
    isOpen, 
    onClose, 
    onProjectSelect, 
    currentProject,
    dialogTitle,
    dialogDescription 
}: ProjectUpdateDialogProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [projects, setProjects] = useState<HistoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildQuery = useCallback(() => {
    if (!user || !currentProject?.parentProjectId) return null;
    return query(
        collection(db, 'requests'),
        where('userId', '==', user.uid),
        where('parentProjectId', '==', currentProject.parentProjectId)
    );
  }, [user, currentProject]);

  const safeFormatDateTime = (value: any) => {
    if (!value) return 'N/A';
    const date = value.toDate ? value.toDate() : new Date(value);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
  };

  useEffect(() => {
    if (!isOpen || !user || !currentProject?.parentProjectId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    const q = buildQuery();
    if (!q) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRequest));
      fetchedProjects.sort((a, b) => (b.version || 0) - (a.version || 0));
      setProjects(fetchedProjects);
      setIsLoading(false);
    }, (error: FirebaseError) => {
      console.error("Error fetching projects for dialog:", error);
      toast({ title: "Ошибка загрузки версий", description: error.message, variant: "destructive"});
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user, currentProject, toast, buildQuery]);

  const refreshVersions = useCallback(async () => {
    const q = buildQuery();
    if (!q) return;
    setIsRefreshing(true);
    try {
      const snapshot = await getDocs(q);
      const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRequest));
      fetchedProjects.sort((a, b) => (b.version || 0) - (a.version || 0));
      setProjects(fetchedProjects);
      if (fetchedProjects.length === 0) {
        toast({
          title: "Данные появятся позже",
          description: "История версий обновляется. Попробуйте нажать «Обновить» чуть позже.",
        });
      }
    } catch (error: any) {
      toast({ title: "Ошибка обновления", description: error.message, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [buildQuery, toast]);

  const handleConfirm = () => {
    if (selectedProjectId) {
      onProjectSelect(selectedProjectId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-muted-foreground">Нет доступных версий.</p>
          ) : (
            <ScrollArea className="h-72">
              <RadioGroup onValueChange={setSelectedProjectId} className="p-1">
                {projects.map(project => (
                  <Label
                    key={project.id}
                    htmlFor={project.id}
                    className="flex items-center space-x-3 p-3 border rounded-md hover:bg-secondary/50 transition-colors cursor-pointer has-[:checked]:bg-secondary"
                  >
                    <RadioGroupItem value={project.id} id={project.id} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        Версия {project.version || 'N/A'}
                        {project.isMainVersion && <span className="text-primary font-bold"> (Основная)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {safeFormatDateTime(project.timestamp)}
                      </p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button variant="outline" onClick={refreshVersions} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Обновить
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProjectId}>
            Загрузить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

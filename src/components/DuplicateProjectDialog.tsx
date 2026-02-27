// src/components/DuplicateProjectDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HistoryRequest } from '@/contexts/AppContext';
import { FileSymlink, Edit, FilePlus } from 'lucide-react';
import { getProjectDisplayName } from '@/lib/project-labels';

export type DuplicateAction = 'open' | 'version' | 'new';

interface DuplicateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: HistoryRequest;
  onAction: (action: DuplicateAction, project: HistoryRequest) => void;
}

const ActionButton = ({ icon: Icon, title, description, onClick }: { icon: React.ElementType, title: string, description: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full text-left p-3 sm:p-4 border rounded-lg hover:bg-secondary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
        <div className="flex items-start gap-3 sm:gap-4">
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 mt-1 text-primary flex-shrink-0" />
            <div className="flex-grow">
                <p className="font-semibold">{title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    </button>
);


export function DuplicateProjectDialog({ isOpen, onClose, project, onAction }: DuplicateProjectDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обнаружен дубликат</DialogTitle>
          <DialogDescription>
            Проект "{getProjectDisplayName(project)}" уже есть в истории. Что вы хотите сделать?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
            <ActionButton
                icon={Edit}
                title="Открыть существующий"
                description="Не тратить кредит, перейти к найденному проекту."
                onClick={() => onAction('open', project)}
            />
            <ActionButton
                icon={FileSymlink}
                title="Создать новую версию"
                description="Анализировать новый файл и сохранить как новую версию. (1 кредит)"
                onClick={() => onAction('version', project)}
            />
            <ActionButton
                icon={FilePlus}
                title="Создать новый проект"
                description="Игнорировать дубликат и создать независимый проект. (1 кредит)"
                onClick={() => onAction('new', project)}
            />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

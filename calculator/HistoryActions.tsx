// src/components/specification/HistoryActions.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Undo2, History } from 'lucide-react';
import type { ActionLog } from "@/contexts/AppContext";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HistoryActionsProps {
    actionHistory: ActionLog[];
    onUndo: () => void;
}

export function HistoryActions({ actionHistory, onUndo }: HistoryActionsProps) {
    if (actionHistory.length === 0) return null;

    return (
        <Accordion type="multiple">
            <AccordionItem value="history" className="border rounded-lg">
                <AccordionTrigger className="p-4">
                     <div className="flex items-center gap-2"><History className="h-5 w-5"/> <CardTitle>История изменений</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-2">
                    {actionHistory.map((action, index) => (
                        <div key={action.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                           <div>
                                <p className="text-foreground">{action.description}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(action.timestamp, { addSuffix: true, locale: ru })}</p>
                           </div>
                           {index === 0 && (
                                <Button size="sm" variant="ghost" onClick={onUndo}>
                                   <Undo2 className="h-4 w-4"/>
                                </Button>
                           )}
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

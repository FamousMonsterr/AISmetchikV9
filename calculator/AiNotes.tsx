// src/components/specification/AiNotes.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";
import { Bot, FileWarning, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiNotesProps {
    aiComment?: string | null;
    importantExtractionNotes?: string[] | null;
    analysisDetails?: any;
}

export function AiNotes({ aiComment, importantExtractionNotes, analysisDetails }: AiNotesProps) {
    const hasNotes = (importantExtractionNotes && importantExtractionNotes.length > 0) || (analysisDetails?.projectHashtags && analysisDetails.projectHashtags.length > 0);
    if (!aiComment && !hasNotes) return null;

    return (
        <Accordion type="multiple" defaultValue={['ai-notes']}>
            <AccordionItem value="ai-notes" className="border rounded-lg">
                <AccordionTrigger className="p-4">
                    <div className="flex items-center gap-2"><Bot className="h-5 w-5"/> <CardTitle>Заметки от AI</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-4">
                    {aiComment && (
                         <div className="prose prose-sm max-w-none text-muted-foreground">{aiComment}</div>
                    )}
                    {hasNotes && (
                        <div className="space-y-2 text-sm">
                           {importantExtractionNotes && importantExtractionNotes.map((note, index) => (
                               <div key={`note-${index}`} className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive-foreground">
                                   <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                   <span>{note}</span>
                               </div>
                           ))}
                           {analysisDetails?.projectHashtags && (
                                <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 text-blue-700">
                                   <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                   <span>Предполагаемые разделы: {analysisDetails.projectHashtags.join(', ')}</span>
                               </div>
                           )}
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

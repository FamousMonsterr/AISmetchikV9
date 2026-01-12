// src/components/specification/AiRecommendations.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, PlusCircle, Sparkles } from "lucide-react";
import type { SpecificationItem } from "@/contexts/AppContext";

interface AiRecommendationsProps {
    recommendedItems: SpecificationItem[];
    onAddRecommendation: (item: SpecificationItem) => void;
    onAddAllRecommendations: () => void;
}

export function AiRecommendations({ recommendedItems, onAddRecommendation, onAddAllRecommendations }: AiRecommendationsProps) {
    if (!recommendedItems || recommendedItems.length === 0) return null;

    return (
        <AccordionItem value="recommendations" className="border rounded-lg">
            <AccordionTrigger className="p-4">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500"/> <CardTitle>Рекомендации AI</CardTitle></div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
                 <div className="space-y-2">
                    {recommendedItems.map(item => (
                        <Card key={item.id} className="p-3 flex items-center justify-between gap-2 bg-secondary/50">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.quantityToInstall} {item.unit}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => onAddRecommendation(item)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Добавить
                            </Button>
                        </Card>
                    ))}
                    <Button onClick={onAddAllRecommendations} className="w-full mt-2">
                        Добавить все
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

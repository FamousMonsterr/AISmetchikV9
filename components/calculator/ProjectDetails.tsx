// src/components/specification/ProjectDetails.tsx
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AnalysisDetails } from "@/contexts/AppContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardTitle } from "@/components/ui/card";


interface ProjectDetailsProps {
    analysisDetails: AnalysisDetails | undefined | null;
    onDetailsChange: (updates: Partial<AnalysisDetails>) => void;
}

export function ProjectDetails({ analysisDetails, onDetailsChange }: ProjectDetailsProps) {

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="object-name">Название объекта</Label>
                    <Input 
                        id="object-name"
                        value={analysisDetails?.objectName || ''}
                        onChange={(e) => onDetailsChange({ objectName: e.target.value })}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="project-code">Шифр проекта</Label>
                    <Input 
                        id="project-code"
                        value={analysisDetails?.projectCode || ''}
                        onChange={(e) => onDetailsChange({ projectCode: e.target.value })}
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="system-type">Тип системы</Label>
                    <Input 
                        id="system-type"
                        value={analysisDetails?.systemType || ''}
                        onChange={(e) => onDetailsChange({ systemType: e.target.value })}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="total-area">Общая площадь</Label>
                    <Input 
                        id="total-area"
                        value={analysisDetails?.totalArea || ''}
                        onChange={(e) => onDetailsChange({ totalArea: e.target.value })}
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="max-height">Высота монтажа</Label>
                    <Input 
                        id="max-height"
                        value={analysisDetails?.maxInstallationHeight || ''}
                        onChange={(e) => onDetailsChange({ maxInstallationHeight: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}

// src/components/dashboard/ProjectGroup.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Group, Pencil, Download, Archive, ArchiveRestore, ChevronDown, Loader2 } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import type { HistoryRequest } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface ProjectGroupProps {
    object: {
        id: string;
        name: string;
        projects: HistoryRequest[];
        isArchived: boolean;
    };
    onEditGroup: (group: any) => void;
    onDownloadReport: (group: any) => void;
    onArchive: (ids: string[]) => void;
    onUnarchive: (ids: string[]) => void;
    isActionPending: boolean;
    density?: 'comfortable' | 'compact';
    isPro?: boolean;
    // Pass down all other props needed by ProjectCard
    [key: string]: any;
}

export function ProjectGroup({ object, onEditGroup, onDownloadReport, onArchive, onUnarchive, isActionPending, density = 'comfortable', isPro = false, ...rest }: ProjectGroupProps) {
    const projectIds = object.projects.map((p: any) => p.id);
    const isActionDisabled = isActionPending;
    const isCompact = density === 'compact';

    return (
        <div key={object.id}>
            <Card className={cn("bg-muted/50 rounded-b-none", isCompact ? "p-2" : "p-3")}>
                <div className={cn("flex items-center justify-between", isCompact && "gap-2")}>
                    <div className="flex items-center gap-3 min-w-0">
                        <Group className="h-6 w-6 text-primary flex-shrink-0"/>
                        <h3 className={cn("font-semibold truncate", isCompact ? "text-base" : "text-lg")} title={object.name}>{object.name}</h3>
                        <Badge variant="secondary" className="flex-shrink-0">{object.projects.length} проект(а)</Badge>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                disabled={isActionDisabled}
                                className={cn(isCompact && "h-8 w-8")}
                                aria-label="Действия группы"
                                title="Действия группы"
                            >
                                {isActionDisabled ? <Loader2 className="h-4 w-4 animate-spin"/> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onEditGroup(object)} disabled={isActionDisabled}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {isPro ? 'Редактировать группу' : 'Редактировать группу (PRO)'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDownloadReport(object)} disabled={isActionDisabled}>
                                <Download className="mr-2 h-4 w-4" />
                                Сводный отчет Excel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!object.isArchived ? (
                                <DropdownMenuItem onSelect={() => onArchive(projectIds)} disabled={isActionDisabled}>
                                    <Archive className="mr-2 h-4 w-4" /> Архивировать группу
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onSelect={() => onUnarchive(projectIds)} disabled={isActionDisabled}>
                                    <ArchiveRestore className="mr-2 h-4 w-4" /> Восстановить группу
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </Card>
            <div className={cn("space-y-2 border border-t-0 rounded-b-lg", isCompact ? "p-1.5" : "p-2")}>
                {object.projects.map((p: any) => <ProjectCard key={p.id} item={p} isGrouped={true} density={density} {...rest} />)}
            </div>
        </div>
    );
}

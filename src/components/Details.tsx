// src/components/Details.tsx
"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface DetailsProps {
    title: string;
    children: React.ReactNode;
}

export function Details({ title, children }: DetailsProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <Button
                variant="link"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-xs p-0 h-auto text-muted-foreground hover:text-foreground transition-colors"
            >
                {title}
                <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", isOpen && "rotate-180")} />
            </Button>
            {isOpen && (
                <div className="mt-2 p-2 border rounded-md bg-secondary/50">
                    {children}
                </div>
            )}
        </div>
    );
}

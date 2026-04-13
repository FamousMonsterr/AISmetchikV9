// src/components/mobile-panel/ActionBlock.tsx
"use client";

import React, { useState } from 'react';
import { motion } from '@/lib/motion';
import { FileText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentGenerationDialog } from '@/components/DocumentGenerationDialog';
import { HistoryRequest, QuoteConfig, Company } from '@/contexts/AppContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ActionBlockProps {
  project: HistoryRequest;
  quoteConfig: QuoteConfig;
  companies: Company[];
  price: number;
  setPrice: (price: number) => void;
  context?: 'top' | 'bottom';
  onOpenCalculator?: () => void;
}

export const ActionBlock = ({ price, setPrice, project, quoteConfig, companies, context = 'top', onOpenCalculator }: ActionBlockProps) => {
    const [isDocGenOpen, setIsDocGenOpen] = useState(false);

    const handleAction = () => {
        setIsDocGenOpen(true);
    };

    return (
        <>
        <DocumentGenerationDialog 
            isOpen={isDocGenOpen}
            onClose={() => setIsDocGenOpen(false)}
            project={project}
            specifications={project.outputSpecifications}
            quoteConfig={quoteConfig}
            companies={companies}
        />
        <div className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 ${context === 'bottom' ? 'mt-8 mb-4' : 'mb-4'}`}>
            {context === 'top' && <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Итоговая смета</h3>}
            
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col w-full">
                    <Label htmlFor="price-input" className="text-[10px] text-gray-400 dark:text-gray-500">Итоговая цена (₽)</Label>
                    <Input 
                        id="price-input"
                        type="number" 
                        value={price} 
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 focus:border-primary focus:outline-none w-full py-1 h-auto px-0"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAction}
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm shadow-lg shadow-blue-200 dark:shadow-none"
                >
                    <FileText size={18} />
                    Документы
                </motion.button>
                {context === 'top' && onOpenCalculator && (
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenCalculator}
                        className="flex items-center justify-center gap-2 border border-primary/30 text-primary py-3 rounded-xl font-medium text-sm bg-white/60 dark:bg-zinc-800/60"
                    >
                        <Settings2 size={18} />
                        Калькулятор
                    </motion.button>
                )}
            </div>
        </div>
        </>
    );
};


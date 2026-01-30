// src/components/mobile-panel/ProjectView.tsx
// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, User, HardHat, FileText, ArrowLeft, Settings2 } from 'lucide-react';
import { onSnapshot, query, collection, where, orderBy } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { useAppContext, type HistoryRequest, type Company, initialQuoteConfig, SpecificationItem } from '@/contexts/AppContext';
import { ActionBlock } from './ActionBlock';
import { Button } from '@/components/ui/button';
import { SpecificationTable } from '@/components/calculator/SpecificationTable';
import { Separator } from '../ui/separator';
import { CompanyFormDialog } from '../CompanyFormDialog';
import { calculateProjectTotals } from '@/lib/calculation';
import { MobileCalculator } from './MobileCalculator';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface ProjectViewProps {
    project: HistoryRequest;
    onBack: () => void;
}

export const ProjectView = ({ project: initialProject, onBack }: ProjectViewProps) => {
    const { user } = useAppContext();
    const [project, setProject] = useState(initialProject);
    const [companies, setCompanies] = useState<Company[]>([]);
    
    // State for calculated SMR cost
    const [smrCost, setSmrCost] = useState(0);

    const [showSpecs, setShowSpecs] = useState(false);
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);

    const [selectedContractorId, setSelectedContractorId] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    // Totals calculation based on current state
    const projectTotals = useMemo(() => {
        const specsWithManualSmr = project.outputSpecifications.map(item => {
            if (item.itemType === 'device' || item.itemType === 'cable' || item.itemType === 'other') {
                 // The actual distribution logic would be more complex
                 // For now, we can just override or use a simple distribution
                 // This is where the output from MobileCalculator's onSmrCostChange is used.
            }
            return item;
        });

        return calculateProjectTotals(specsWithManualSmr, project.quoteConfig || initialQuoteConfig);
    }, [project.outputSpecifications, project.quoteConfig, smrCost]);
    
    // Update local price state when projectTotals change
    const [price, setPrice] = useState(projectTotals.finalTotal);
    useEffect(() => {
        setPrice(projectTotals.finalTotal);
    }, [projectTotals.finalTotal]);


    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'companies'), where('userId', '==', user.uid), orderBy('isDefault', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
            setCompanies(fetchedCompanies);
            if (!selectedContractorId) {
                setSelectedContractorId(fetchedCompanies.find(c => c.isDefault && !c.isClient)?.id || fetchedCompanies.find(c => !c.isClient)?.id || '');
            }
            if (!selectedClientId) {
                setSelectedClientId(fetchedCompanies.find(c => c.isDefault && c.isClient)?.id || fetchedCompanies.find(c => c.isClient)?.id || '');
            }
        });
        return () => unsubscribe();
    }, [user, selectedContractorId, selectedClientId]);

    const handleUpdateItem = (id: string, updates: Partial<SpecificationItem>) => {
        setProject(prev => {
            if (!prev) return null;
            const newSpecs = prev.outputSpecifications.map(item => item.id === id ? {...item, ...updates} : item);
            return { ...prev, outputSpecifications: newSpecs };
        });
    };

    const handleRemoveItem = (id: string) => {
        setProject(prev => {
             if (!prev) return null;
             return { ...prev, outputSpecifications: prev.outputSpecifications.filter(item => item.id !== id) };
        });
    };

    const handleAddItem = () => {
        // Implement add item logic if needed
    };
    
    const contractorOptions = companies.filter(c => !c.isClient);
    const clientOptions = companies.filter(c => c.isClient);

    return (
        <>
            <CompanyFormDialog
                isOpen={isClientFormOpen}
                onClose={() => setIsClientFormOpen(false)}
                onSuccess={() => setIsClientFormOpen(false)}
                isClientForm={true} // Specify this is for creating a client
            />
            <motion.div 
              key={project.id}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="space-y-4"
            >
                <div className="sticky top-2 z-30 flex items-center justify-between gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl px-2 py-2 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <Button variant="ghost" size="sm" onClick={onBack} className="h-9 px-3"><ArrowLeft className="mr-2 h-4 w-4"/> Все проекты</Button>
                    <div className="min-w-0 text-right">
                        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate" title={project.fileName}>
                          {project.fileName}
                        </h1>
                        <p className="text-[10px] text-gray-400 mt-0.5">Обновлено: {project.timestamp?.toDate ? new Date(project.timestamp.toDate()).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                <ActionBlock 
                  project={project}
                  quoteConfig={project.quoteConfig || initialQuoteConfig}
                  companies={companies}
                  price={price} 
                  setPrice={setPrice}
                  context="top"
                />
                
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3 border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400"><HardHat size={18}/></div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">Исполнитель</label>
                      <select value={selectedContractorId} onChange={(e) => setSelectedContractorId(e.target.value)} className="w-full bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none truncate pr-4">
                        {contractorOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                   <div className="flex items-center gap-3">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400"><User size={18}/></div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-0.5">Заказчик</label>
                      <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none truncate pr-4">
                        <option value="">Выберите клиента</option>
                        {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="new">+ Создать нового клиента</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                  <button 
                    onClick={() => setShowSpecs(!showSpecs)}
                    className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50/50 dark:bg-zinc-800/50"
                  >
                    <span className="flex items-center gap-2"><FileText size={16}/> Управление спецификацией</span>
                    {showSpecs ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  
                  <AnimatePresence>
                    {showSpecs && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 sm:p-4 border-t border-gray-100 dark:border-zinc-800">
                             <MobileCalculator 
                                project={project}
                                onSmrCostChange={setSmrCost}
                            />
                             <Separator className="my-4" />
                            <SpecificationTable
                                specifications={project.outputSpecifications}
                                onUpdate={handleUpdateItem}
                                onRemove={handleRemoveItem}
                                onAddItem={handleAddItem}
                                quoteConfig={project.quoteConfig || initialQuoteConfig}
                            />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <Separator />

                <ActionBlock 
                   project={project}
                   quoteConfig={project.quoteConfig || initialQuoteConfig}
                   companies={companies}
                   price={price} 
                   setPrice={setPrice}
                   context="bottom"
                />
            </motion.div>
        </>
    );
};

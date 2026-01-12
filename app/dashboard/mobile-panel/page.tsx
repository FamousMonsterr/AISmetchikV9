// src/app/dashboard/mobile-panel/page.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, FileUp, Check, X, Search } from 'lucide-react';
import { onSnapshot, collection, query, where, orderBy, limit } from '@/lib/mongoFirestore';

import { useAppContext, type HistoryRequest } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { ProcessingDialog } from "@/components/ProcessingDialog";
import { InsufficientCreditsDialog } from '@/components/InsufficientCreditsDialog';
import { HistorySection } from '@/components/dashboard/HistorySection';
import { Button } from '@/components/ui/button';
import { ProjectView } from '@/components/mobile-panel/ProjectView';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function MobilePanelPage() {
    const { user, userAvailableModels, setCurrentProject: setGlobalProject } = useAppContext();
    const { toast } = useToast();

    const [localCurrentProject, setLocalCurrentProject] = useState<HistoryRequest | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
    const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const selectedModel = useMemo(() => {
        return userAvailableModels.find(m => m.isDefault)?.value || userAvailableModels[0]?.value || '';
    }, [userAvailableModels]);

    // Load last project on initial mount
    useEffect(() => {
        if (!user) {
          setIsLoading(false);
          return;
        };

        const q = query(
            collection(db, 'requests'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryRequest));
                const mainProject = docs.find(project => project.isMainVersion !== false) || docs[0];
                if (mainProject) {
                    setLocalCurrentProject(mainProject);
                    setGlobalProject(mainProject); 
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user, setGlobalProject]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];

        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "Файл слишком большой",
                description: `Максимальный размер файла 50 МБ. Ваш файл весит ${(file.size / 1024 / 1024).toFixed(2)} МБ.`,
                variant: "destructive",
            });
            return;
        }

        setSelectedFile(file);
        if (!user || (user.credits || 0) < 1) {
            setIsCreditsDialogOpen(true);
        } else {
            setIsProcessingDialogOpen(true);
        }
    }, [toast, user]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

    const handleProjectSelect = (project: HistoryRequest) => {
        setLocalCurrentProject(project);
        setGlobalProject(project);
    };
    
    const handleClearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-10 w-full overflow-x-hidden max-w-[100vw]">
            <div className="max-w-md mx-auto px-4 pt-4">
                {isProcessingDialogOpen && selectedFile && (
                    <ProcessingDialog
                        isOpen={isProcessingDialogOpen}
                        file={selectedFile}
                        model={selectedModel}
                        onClose={() => {
                            setIsProcessingDialogOpen(false);
                            setSelectedFile(null);
                        }}
                    />
                )}
                <InsufficientCreditsDialog isOpen={isCreditsDialogOpen} onClose={() => setIsCreditsDialogOpen(false)} />

                <AnimatePresence mode="wait">
                    {!localCurrentProject ? (
                        <motion.div
                            key="uploader-and-history"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                {...getRootProps()} 
                                onClick={(e) => (e.currentTarget.querySelector('input') as HTMLElement)?.click()}
                                className="mb-4"
                            >
                                <input {...getInputProps()} />
                                <div className="relative overflow-hidden group bg-gradient-to-br from-primary to-primary/80 dark:from-blue-500 dark:to-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg shadow-blue-200 cursor-pointer">
                                  <AnimatePresence mode="wait">
                                    {!selectedFile ? (
                                        <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
                                                <FileUp className="mx-auto mb-2 opacity-80" size={32} />
                                            </motion.div>
                                            <p className="font-medium text-sm">Загрузить файл для анализа</p>
                                            <p className="text-[10px] opacity-70 mt-1">.xlsx, .xml, .pdf</p>
                                        </motion.div>
                                    ) : (
                                       <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                            <Check className="h-8 w-8" />
                                            <p className="font-semibold truncate max-w-full px-4">{selectedFile.name}</p>
                                            <Button size="sm" variant="ghost" onClick={handleClearFile} className="h-auto p-1 text-xs hover:bg-white/20"><X className="mr-1 h-3 w-3" /> Очистить</Button>
                                        </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                            </motion.div>

                            <div className="relative mb-6">
                                <input 
                                    type="text" 
                                    placeholder="Найти проект..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-full py-2.5 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                                />
                                <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
                            </div>

                            <HistorySection isMobilePanel={true} onProjectSelect={handleProjectSelect} searchTerm={searchQuery} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="project-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <ProjectView
                                project={localCurrentProject}
                                onBack={() => { setLocalCurrentProject(null); setGlobalProject(null); }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

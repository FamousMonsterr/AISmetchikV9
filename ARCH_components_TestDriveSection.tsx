// src/components/landing/TestDriveSection.tsx
"use client";

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { GlassCard } from '@/components/ui/glass-card';
import { Loader2, FileUp, Sparkles, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { ProcessingDialog } from '@/components/ProcessingDialog';
import { InsufficientCreditsDialog } from '@/components/InsufficientCreditsDialog';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import aiConfig from '@/lib/ai-config.json';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function TestDriveSection() {
    const { toast } = useToast();
    const { user } = useAppContext();
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
    
    const guestModel = useMemo(() => {
        return aiConfig.apiModels.find(m => m.isDefault)?.value || aiConfig.apiModels[0]?.value || '';
    }, []);

    // Guest credits are hardcoded for now for test drive
    const [guestCredits, setGuestCredits] = useState(1);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
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
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        maxSize: MAX_FILE_SIZE,
    });

    const handleAnalysis = () => {
        if (!selectedFile) return;

        if (user) { // Logged-in user
            if ((user.credits || 0) < 1) {
                setIsCreditsDialogOpen(true);
            } else {
                setIsDialogOpen(true);
            }
        } else { // Guest user
            if (guestCredits > 0) {
                setGuestCredits(prev => prev - 1);
                setIsDialogOpen(true);
            } else {
                toast({
                    title: "Тестовые кредиты закончились",
                    description: "Пожалуйста, зарегистрируйтесь, чтобы получить больше кредитов и продолжить работу.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleClearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
    };

    return (
        <>
        {isDialogOpen && selectedFile && (
            <ProcessingDialog
                isOpen={isDialogOpen}
                file={selectedFile}
                model={guestModel}
                onClose={() => setIsDialogOpen(false)}
            />
        )}
         <InsufficientCreditsDialog
            isOpen={isCreditsDialogOpen}
            onClose={() => setIsCreditsDialogOpen(false)}
        />
        <section className="py-10" id="test-drive">
            <div className="container mx-auto">
                <GlassCard className="text-center" gradient="none" interactive={false}>
                    <h2 className="text-3xl font-bold text-foreground">Попробуйте прямо сейчас</h2>
                    <p className="mt-2 text-muted-foreground">Загрузите один файл, чтобы оценить возможности AI. Зарегистрируйтесь, чтобы сохранить результат.</p>
                    <div className="mt-6 flex flex-col items-center gap-4">
                        <motion.div
                            {...getRootProps()}
                            onClick={(e) => {
                                const input = e.currentTarget.querySelector('input');
                                if (input) input.click();
                            }}
                            className={cn(
                                "relative w-full max-w-lg p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300",
                                isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <input {...getInputProps()} />
                             <AnimatePresence mode="wait">
                                {!selectedFile ? (
                                    <motion.div
                                        key="prompt"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col items-center gap-2 text-muted-foreground"
                                    >
                                        <FileUp className="mx-auto h-10 w-10" />
                                        <h3 className="font-semibold text-foreground">Перетащите файл или <span className="text-primary hover:underline">нажмите для выбора</span></h3>
                                        <p className="text-xs">PDF, JPG, PNG (до 50МБ)</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="file"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center gap-3 text-foreground"
                                    >
                                        <Check className="h-10 w-10 text-green-500" />
                                        <p className="font-semibold text-primary-foreground truncate max-w-full px-4">{selectedFile.name}</p>
                                        <Button size="sm" variant="secondary" onClick={handleClearFile} className="bg-secondary/80 hover:bg-secondary"><X className="mr-1 h-3 w-3" /> Очистить</Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}>
                            <Button size="lg" onClick={handleAnalysis} disabled={!selectedFile || isDialogOpen}>
                                {isDialogOpen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isDialogOpen ? 'Анализ...' : 'Запустить анализ'}
                            </Button>
                        </motion.div>
                        {!user && (
                            <p className="text-sm text-muted-foreground">Осталось попыток: {guestCredits}</p>
                        )}
                    </div>
                </GlassCard>
            </div>
        </section>
        </>
    );
}

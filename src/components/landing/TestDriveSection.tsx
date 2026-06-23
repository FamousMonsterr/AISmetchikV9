// @ts-nocheck
// src/components/landing/TestDriveSection.tsx
"use client";

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { GlassCard } from '@/components/ui/glass-card';
import { Loader2, FileUp, Sparkles, X, Check, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { ProcessingDialog } from '@/components/ProcessingDialog';
import { InsufficientCreditsDialog } from '@/components/InsufficientCreditsDialog';
import { motion, AnimatePresence } from "@/lib/motion";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
        <section className="py-20 relative" id="test-drive">
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-blue-500/5 via-primary/5 to-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <GlassCard className="text-center p-8 md:p-12" interactive={false}>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
                            <Zap className="h-4 w-4" />
                            Тест-драйв
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                            Попробуйте прямо сейчас
                        </h2>
                        <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Загрузите один файл, чтобы оценить возможности AI. Зарегистрируйтесь, чтобы сохранить результат.
                        </p>

                        <div className="mt-10 flex flex-col items-center gap-6">
                            <motion.div
                                {...getRootProps()}
                                onClick={(e) => {
                                    const input = e.currentTarget.querySelector('input');
                                    if (input) input.click();
                                }}
                                className={cn(
                                    "relative w-full max-w-lg p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300",
                                    isDragActive
                                        ? "border-primary bg-primary/10 scale-[1.02]"
                                        : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                                )}
                                whileHover={{ scale: 1.01 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <input {...getInputProps()} />
                                 <AnimatePresence mode="wait">
                                    {!selectedFile ? (
                                        <motion.div
                                            key="prompt"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="flex flex-col items-center gap-3 text-muted-foreground"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                                <FileUp className="h-8 w-8 text-primary" />
                                            </div>
                                            <h3 className="font-semibold text-foreground text-lg">
                                                Перетащите файл или <span className="text-primary hover:underline">нажмите для выбора</span>
                                            </h3>
                                            <p className="text-sm">PDF, JPG, PNG (до 50МБ)</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="file"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center gap-3 text-foreground"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-2">
                                                <Check className="h-8 w-8 text-success" />
                                            </div>
                                            <p className="font-semibold text-foreground truncate max-w-full px-4">{selectedFile.name}</p>
                                            <Button size="sm" variant="secondary" onClick={handleClearFile} className="bg-secondary/80 hover:bg-secondary">
                                                <X className="mr-1 h-3 w-3" /> Очистить
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                            >
                                <Button
                                    size="lg"
                                    onClick={handleAnalysis}
                                    disabled={!selectedFile || isDialogOpen}
                                    className="px-8"
                                >
                                    {isDialogOpen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {isDialogOpen ? 'Анализ...' : 'Запустить анализ'}
                                </Button>
                            </motion.div>

                            {!user && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-sm text-muted-foreground flex items-center gap-2"
                                >
                                    <Zap className="h-4 w-4 text-primary" />
                                    Осталось попыток: <span className="font-semibold text-foreground">{guestCredits}</span>
                                </motion.p>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </section>
        </>
    );
}

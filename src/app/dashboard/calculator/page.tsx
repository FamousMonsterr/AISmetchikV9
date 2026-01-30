// src/app/dashboard/calculator/page.tsx
"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppContext } from '@/contexts/AppContext';

// Corrected import path
const SpecificationPageContent = dynamic(() => import('@/components/calculator/SpecificationPageContent'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
});


export default function CalculatorPage() {
    const { currentProject, currentGroup, setCurrentProject, isLoading: isContextLoading } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        // This effect ensures that if a user tries to access the page directly
        // without a project selected, they are redirected.
        // It waits for the context to finish loading before making a decision.
        if (!isContextLoading && !currentProject && currentGroup?.length) {
            setCurrentProject(currentGroup[0]);
            return;
        }
        if (!isContextLoading && !currentProject) {
            router.replace('/dashboard');
        }
    }, [currentProject, currentGroup, isContextLoading, router, setCurrentProject]);


    // While the context is loading, or if we are about to redirect, show a loader.
    if (isContextLoading || !currentProject) {
         return (
             <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Загрузка проекта...</p>
                </div>
            </div>
        );
    }
    
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <div className="w-full space-y-8">
                <SpecificationPageContent />
            </div>
        </Suspense>
    );
}

// src/components/mobile-panel/ProjectView.tsx
// @ts-nocheck
"use client";

import React, { useEffect } from 'react';
import { motion } from '@/lib/motion';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useAppContext, type HistoryRequest } from '@/contexts/AppContext';

const SpecificationPageContent = dynamic(() => import('@/components/calculator/SpecificationPageContent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

interface ProjectViewProps {
    project: HistoryRequest;
    onBack: () => void;
}

export const ProjectView = ({ project: initialProject, onBack }: ProjectViewProps) => {
    const { currentProject, setCurrentProject } = useAppContext();

    useEffect(() => {
        if (initialProject && currentProject?.id !== initialProject.id) {
            setCurrentProject(initialProject);
        }
    }, [initialProject, currentProject?.id, setCurrentProject]);

    return (
        <motion.div
          key={initialProject.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <SpecificationPageContent onBackToProjects={onBack} variant="pwa" />
        </motion.div>
    );
};


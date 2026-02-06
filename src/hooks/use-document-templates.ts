"use client";

import { useEffect, useState } from 'react';
import { getDocumentTemplatesBundle, type DocumentTemplate, type DocumentTemplateSettings } from '@/actions/documentTemplateActions';
import { registerTemplateCatalog } from '@/lib/document-constructor';

export function useDocumentTemplates(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [settings, setSettings] = useState<DocumentTemplateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    setIsLoading(true);
    getDocumentTemplatesBundle()
      .then((result) => {
        if (!isMounted) return;
        setTemplates(result.templates || []);
        setSettings(result.settings || null);
        registerTemplateCatalog(result.templates || []);
      })
      .catch((error) => {
        console.warn('Failed to load document templates', error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { templates, settings, isLoading };
}

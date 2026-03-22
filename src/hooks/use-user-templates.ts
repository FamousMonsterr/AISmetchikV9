// src/hooks/use-user-templates.ts
"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from '@/lib/db-client';
import { db } from '@/lib/db';
import { useAppContext } from '@/contexts/AppContext';
import type { UserTemplate } from '@/lib/template-utils';

type UseUserTemplatesOptions = {
  enabled?: boolean;
};

export function useUserTemplates(options: UseUserTemplatesOptions = {}) {
  const { enabled = true } = options;
  const { user } = useAppContext();
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled || !user) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'user_templates'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextTemplates = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as UserTemplate));
        setTemplates(nextTemplates);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return () => unsubscribe();
  }, [enabled, user?.uid]);

  return { templates, isLoading };
}

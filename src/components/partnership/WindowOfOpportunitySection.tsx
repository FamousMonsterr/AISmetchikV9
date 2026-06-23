"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/ui/glass-card';
import { Zap } from 'lucide-react';
import { CtaButton } from "@/components/landing/CtaButton";

const LegalEntityRegistrationDialog = dynamic(
  () => import('@/components/LegalEntityRegistrationDialog').then((mod) => mod.LegalEntityRegistrationDialog),
  { ssr: false }
);

export const WindowOfOpportunitySection = () => {
  const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = React.useState(false);

  return (
    <>
      {isPartnerRegisterOpen ? (
        <LegalEntityRegistrationDialog
          isOpen={isPartnerRegisterOpen}
          onClose={() => setIsPartnerRegisterOpen(false)}
          isPartnerRegistration={true}
        />
      ) : null}
      <section className="py-20">
        <div className="container mx-auto">
          <GlassCard className="text-center">
            <div className="max-w-3xl mx-auto">
              <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-6">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Почему сейчас — лучшее время?</h2>
              <p className="text-lg text-muted-foreground mt-4">
                Рынок слаботочных систем находится на пороге цифровой революции. Старые методы работы уходят в прошлое, а
                спрос на автоматизацию и эффективность растет с каждым днем.
              </p>
              <p className="mt-4 text-2xl font-bold text-primary">
                Вы можете стать лидером этой трансформации в своем регионе.
              </p>
              <p className="text-muted-foreground mt-4">
                Став партнером Montage HUB сегодня, вы получаете уникальное преимущество первопроходца на рынке, который
                ежегодно растет на 37%. Не упустите шанс занять свою нишу, пока это не сделали другие.
              </p>
              <div className="mt-8">
                <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)} variant="primary" size="lg">
                  Войти в рынок сейчас
                </CtaButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  );
};

"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "@/lib/motion";
import { GlassCard } from '@/components/ui/glass-card';
import { CtaButton } from "@/components/landing/CtaButton";
import { Loader2 } from 'lucide-react';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';

export const FinalCtaSection = () => {
  const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number | undefined }>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Set timer only on client
    const calculateTimeLeft = () => {
      const initialSeconds = (29 * 24 * 60 * 60) + (22 * 60 * 60) + (18 * 60) + 16;
      const startTimeItem = window.localStorage.getItem('timerStartTime');
      const now = new Date().getTime();
      let startTimestamp;

      if (startTimeItem) {
          startTimestamp = parseInt(startTimeItem, 10);
      } else {
          startTimestamp = now;
          window.localStorage.setItem('timerStartTime', String(startTimestamp));
      }
      
      const elapsedSeconds = Math.floor((now - startTimestamp) / 1000);
      let difference = initialSeconds - elapsedSeconds;
      
      let newTimeLeft: { [key: string]: number } = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (60 * 60 * 24)),
          hours: Math.floor((difference / (60 * 60)) % 24),
          minutes: Math.floor((difference / 60) % 60),
          seconds: Math.floor(difference % 60),
        };
      }
      return newTimeLeft;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timerComponents = [
      {label: 'Дней', value: timeLeft.days},
      {label: 'Часов', value: timeLeft.hours},
      {label: 'Минут', value: timeLeft.minutes},
      {label: 'Секунд', value: timeLeft.seconds},
  ];

  return (
    <>
      <LegalEntityRegistrationDialog isOpen={isPartnerRegisterOpen} onClose={() => setIsPartnerRegisterOpen(false)} isPartnerRegistration={true} />
      <section className="py-20">
        <div className="container mx-auto">
          <GlassCard className="text-center p-8">
            <h2 className="text-3xl font-bold text-foreground">Начните зарабатывать, пока это не сделали ваши конкуренты</h2>
            <p className="mt-2 text-muted-foreground">Текущие льготные условия партнерской программы действительны до <span className="font-bold text-foreground">31 декабря 2025 года</span>.</p>
            
            <div className="my-8 flex justify-center gap-2 sm:gap-4">
                {isClient ? timerComponents.map(part => (
                    <div key={part.label} className="text-center p-2 sm:p-3 bg-background/50 rounded-lg w-16 sm:w-20">
                        <p className="text-2xl sm:text-3xl font-bold">{String(part.value || 0).padStart(2, '0')}</p>
                        <p className="text-xs text-muted-foreground">{part.label}</p>
                    </div>
                )) : (
                    <div className="h-[76px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
            </div>

            <p className="text-sm font-semibold text-destructive mb-8">После этой даты стоимость паушального взноса увеличится в 4 раза!</p>
            
            <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)} variant="primary" size="lg">
                Стать партнером на выгодных условиях
            </CtaButton>
          </GlassCard>
        </div>
      </section>
    </>
  );
};


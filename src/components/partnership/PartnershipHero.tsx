"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CtaButton } from "@/components/landing/CtaButton";
import { Handshake } from 'lucide-react';

const LegalEntityRegistrationDialog = dynamic(
  () => import('@/components/LegalEntityRegistrationDialog').then((mod) => mod.LegalEntityRegistrationDialog),
  { ssr: false }
);

const TypingAnimation = ({ words }: { words: string[] }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentWord = words[wordIndex] ?? '';

  useEffect(() => {
    const reachedEnd = charIndex >= currentWord.length;
    const reachedStart = charIndex <= 0;

    const timeout = window.setTimeout(
      () => {
        if (!isDeleting && reachedEnd) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && reachedStart) {
          setIsDeleting(false);
          setWordIndex((prevIndex) => (prevIndex + 1) % words.length);
          return;
        }

        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      },
      reachedEnd && !isDeleting ? 1300 : isDeleting ? 45 : 85
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [charIndex, currentWord.length, isDeleting, words.length]);

  return (
    <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
      {currentWord.slice(0, charIndex)}
    </span>
  );
};

export const PartnershipHero = () => {
  const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = useState(false);

  return (
    <>
      {isPartnerRegisterOpen ? (
        <LegalEntityRegistrationDialog
          isOpen={isPartnerRegisterOpen}
          onClose={() => setIsPartnerRegisterOpen(false)}
          isPartnerRegistration={true}
        />
      ) : null}
      <section className="relative pt-24 pb-20 text-center">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground flex flex-col items-center gap-2">
            <span>Зарабатывайте на</span>
            <div className="h-16 md:h-20">
              <TypingAnimation words={["Революции", "Сервисе №1"]} />
            </div>
            <div>
              в создании смет
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                слаботочных систем
              </span>
            </div>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground">
            Присоединяйтесь к нашей партнерской программе. Привлекайте пользователей, помогайте им с интеграцией и
            получайте стабильно высокий доход.
          </p>
          <div className="mt-8 flex justify-center items-center gap-4">
            <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)}>
              <Handshake className="mr-2 h-4 w-4" />
              Стать партнером
            </CtaButton>
          </div>
        </div>
      </section>
    </>
  );
};

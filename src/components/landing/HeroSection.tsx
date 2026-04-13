"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import { RegistrationDialog } from "@/components/RegistrationDialog";
import { CtaButton } from "./CtaButton";

const TypingAnimation = ({ words }: { words: string[] }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayText = useTransform(rounded, (latest) => words[wordIndex].slice(0, latest));

  useEffect(() => {
    const typingAnimation = animate(count, words[wordIndex].length, {
      type: "tween",
      duration: 1,
      ease: "easeInOut",
      onComplete: () => {
        setTimeout(() => {
          const deletingAnimation = animate(count, 0, {
            type: "tween",
            duration: 1,
            ease: "easeInOut",
            onComplete: () => setWordIndex((prevIndex) => (prevIndex + 1) % words.length),
          });
          return deletingAnimation.stop;
        }, 1500);
      },
    });

    return () => typingAnimation.stop();
  }, [count, wordIndex, words]);

  return <motion.span className="text-primary">{displayText}</motion.span>;
};

export const HeroSection = () => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <>
      <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <section className="relative pb-20 pt-24 text-center">
        <div className="container mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-4xl font-extrabold tracking-tight text-foreground md:text-6xl"
          >
            <div className="h-16 md:h-20">
              <TypingAnimation words={["Революция", "Сервис №1"]} />
            </div>
            <div>
              в создании смет
              <br />
              <span className="text-primary">слаботочных систем</span>
            </div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Превращаем часы ручной работы в минуты. AI-помощник для профессиональных
            сметчиков и монтажников.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <CtaButton href="#" onClick={() => setIsRegisterOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Начать бесплатно
            </CtaButton>
          </motion.div>
        </div>
      </section>
    </>
  );
};

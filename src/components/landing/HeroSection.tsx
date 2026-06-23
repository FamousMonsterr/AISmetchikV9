"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Sparkles, ArrowRight, Play } from "lucide-react";
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

const stats = [
  { value: "10 000+", label: "Смет создано" },
  { value: "500+", label: "Пользователей" },
  { value: "2 мин", label: "Среднее время" },
  { value: "99%", label: "Точность" },
];

export const HeroSection = () => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <>
      <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <section className="relative pb-20 pt-24 text-center overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="container mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="h-4 w-4" />
            AI-помощник для сметчиков
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl"
          >
            <div className="h-16 md:h-20 lg:h-24">
              <TypingAnimation words={["Революция", "Сервис №1"]} />
            </div>
            <div>
              в создании смет
              <br />
              <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                слаботочных систем
              </span>
            </div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
          >
            Превращаем часы ручной работы в минуты. AI-помощник для профессиональных
            сметчиков и монтажников.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <CtaButton href="#" onClick={() => setIsRegisterOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Начать бесплатно
            </CtaButton>
            <CtaButton href="#how-it-works" variant="secondary">
              <Play className="mr-2 h-4 w-4" />
              Как это работает
            </CtaButton>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
};

"use client";
import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { CtaButton } from "@/components/landing/CtaButton";
import { Handshake } from 'lucide-react';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';

const TypingAnimation = ({ words }: { words: string[] }) => {
    const [wordIndex, setWordIndex] = useState(0);
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const displayText = useTransform(rounded, (latest) =>
      words[wordIndex].slice(0, latest)
    );

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
                        onComplete: () => {
                           setWordIndex((prevIndex) => (prevIndex + 1) % words.length);
                        }
                    });
                    return deletingAnimation.stop;
                }, 1500); 
            }
        });
        return () => {
            typingAnimation.stop();
        };
    }, [wordIndex, words, count]);

    return (
        <motion.span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
            {displayText}
        </motion.span>
    );
};


export const PartnershipHero = () => {
    const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = useState(false);
    return (
        <>
        <LegalEntityRegistrationDialog isOpen={isPartnerRegisterOpen} onClose={() => setIsPartnerRegisterOpen(false)} isPartnerRegistration={true} />
        <section className="relative pt-24 pb-20 text-center">
            <div className="container mx-auto">
                 <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground flex flex-col items-center gap-2"
                >
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
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground"
                >
                    Присоединяйтесь к нашей партнерской программе. Привлекайте пользователей, помогайте им с интеграцией и получайте стабильно высокий доход.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-8 flex justify-center items-center gap-4"
                >
                    <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)}>
                        <Handshake className="mr-2 h-4 w-4" />
                        Стать партнером
                    </CtaButton>
                </motion.div>
            </div>
        </section>
        </>
    );
}

// src/app/page.tsx
"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestDriveSection } from "@/components/landing/TestDriveSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { GlassCard } from "@/components/ui/glass-card";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { SuccessStoriesSection } from "@/components/landing/SuccessStoriesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";


const VideoSection = () => (
    <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="py-20"
    >
        <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground">Узнайте больше за 2 минуты</h2>
                <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <span>Посмотрите короткое видео о том, как</span>
                    <Logo />
                    <span>меняет правила игры.</span>
                </p>
            </div>
            <GlassCard interactive={false}>
                <div className="aspect-video w-full flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-muted-foreground">Здесь будет ваше видео</p>
                </div>
            </GlassCard>
        </div>
    </motion.section>
);


export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <VideoSection />
      <TestDriveSection />
      <SuccessStoriesSection />
      <TestimonialsSection />
      <PartnershipSection />
      <IntegrationsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}

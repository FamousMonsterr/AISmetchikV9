"use client";

import { CtaSection } from "@/components/landing/CtaSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { HubSection } from "@/components/landing/HubSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { PartnershipSection } from "@/components/landing/PartnershipSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { SuccessStoriesSection } from "@/components/landing/SuccessStoriesSection";
import { TestDriveSection } from "@/components/landing/TestDriveSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <HubSection />
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

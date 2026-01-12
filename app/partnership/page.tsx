"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { PartnershipHero } from '@/components/partnership/PartnershipHero';
import { MarketNumbersSection } from '@/components/partnership/MarketNumbersSection';
import { TargetAudienceSection } from '@/components/partnership/TargetAudienceSection';
import { WindowOfOpportunitySection } from '@/components/partnership/WindowOfOpportunitySection';
import { MarketPotentialSection } from '@/components/partnership/MarketPotentialSection';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

const VideoSection = dynamic(() => import('@/components/partnership/VideoSection').then(mod => mod.VideoSection), { loading: () => <LoadingSpinner />, ssr: false });
const UseCasesSection = dynamic(() => import('@/components/partnership/UseCasesSection').then(mod => mod.UseCasesSection), { loading: () => <LoadingSpinner />, ssr: false });
const TiersSection = dynamic(() => import('@/components/partnership/TiersSection').then(mod => mod.TiersSection), { loading: () => <LoadingSpinner />, ssr: false });
const IncomeCalculator = dynamic(() => import('@/components/partnership/IncomeCalculator').then(mod => mod.IncomeCalculator), { loading: () => <LoadingSpinner />, ssr: false });
const TestimonialsSection = dynamic(() => import('@/components/partnership/TestimonialsSection').then(mod => mod.TestimonialsSection), { loading: () => <LoadingSpinner />, ssr: false });
const HowItWorks = dynamic(() => import('@/components/partnership/HowItWorks').then(mod => mod.HowItWorks), { loading: () => <LoadingSpinner />, ssr: false });
const FinalCtaSection = dynamic(() => import('@/components/partnership/FinalCtaSection').then(mod => mod.FinalCtaSection), { loading: () => <LoadingSpinner />, ssr: false });

export default function PartnershipPage() {
    return (
        <>
            <PartnershipHero />
            <VideoSection />
            <MarketNumbersSection />
            <TargetAudienceSection />
            <MarketPotentialSection />
            <WindowOfOpportunitySection />
            <HowItWorks />
            <TiersSection />
            <IncomeCalculator />
            <TestimonialsSection />
            <FinalCtaSection />
        </>
    );
}

"use client";

import dynamic from 'next/dynamic';
import { PartnershipHero } from '@/components/partnership/PartnershipHero';

const LoadingBlock = () => (
  <div className="flex justify-center items-center h-48">
    <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const VideoSection = dynamic(() => import('@/components/partnership/VideoSection').then((mod) => mod.VideoSection), {
  loading: () => <LoadingBlock />,
  ssr: false,
});

const MarketNumbersSection = dynamic(
  () => import('@/components/partnership/MarketNumbersSection').then((mod) => mod.MarketNumbersSection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const TargetAudienceSection = dynamic(
  () => import('@/components/partnership/TargetAudienceSection').then((mod) => mod.TargetAudienceSection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const MarketPotentialSection = dynamic(
  () => import('@/components/partnership/MarketPotentialSection').then((mod) => mod.MarketPotentialSection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const WindowOfOpportunitySection = dynamic(
  () => import('@/components/partnership/WindowOfOpportunitySection').then((mod) => mod.WindowOfOpportunitySection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const HowItWorks = dynamic(() => import('@/components/partnership/HowItWorks').then((mod) => mod.HowItWorks), {
  loading: () => <LoadingBlock />,
  ssr: false,
});

const TiersSection = dynamic(() => import('@/components/partnership/TiersSection').then((mod) => mod.TiersSection), {
  loading: () => <LoadingBlock />,
  ssr: false,
});

const IncomeCalculator = dynamic(
  () => import('@/components/partnership/IncomeCalculator').then((mod) => mod.IncomeCalculator),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const TestimonialsSection = dynamic(
  () => import('@/components/partnership/TestimonialsSection').then((mod) => mod.TestimonialsSection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

const FinalCtaSection = dynamic(
  () => import('@/components/partnership/FinalCtaSection').then((mod) => mod.FinalCtaSection),
  {
    loading: () => <LoadingBlock />,
    ssr: false,
  }
);

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

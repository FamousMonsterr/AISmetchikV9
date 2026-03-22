// src/components/requests/RequestFeatureCard.tsx
"use client";

import type React from 'react';
import { motion } from '@/lib/motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RequestFeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  features?: string[];
  priceLabel?: string;
  ctaLabel: string;
  ctaIcon?: React.ReactNode;
  onCta?: () => void;
  isPending?: boolean;
  className?: string;
};

const MotionCard = motion(Card);

export function RequestFeatureCard({
  icon,
  title,
  description,
  features = [],
  priceLabel,
  ctaLabel,
  ctaIcon,
  onCta,
  isPending,
  className,
}: RequestFeatureCardProps) {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('request-card', className)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {priceLabel && <div className="text-2xl font-bold">{priceLabel}</div>}
        {features.length > 0 && (
          <ul className="space-y-2 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" onClick={onCta} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ctaIcon}
          {ctaLabel}
        </Button>
      </CardFooter>
    </MotionCard>
  );
}


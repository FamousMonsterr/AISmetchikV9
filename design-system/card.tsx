'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-bg-secondary border border-border rounded-2xl p-8 transition-all duration-250',
          hover && 'hover:-translate-y-1 hover:border-border-hover hover:bg-bg-tertiary',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface FeatureCardProps extends CardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon, title, description, className, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="w-12 h-12 bg-bg-elevated border border-border rounded-lg flex items-center justify-center text-2xl mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      </Card>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

interface PricingCardProps extends CardProps {
  resolution: 'sd' | 'hd' | 'fullhd' | '4k';
  title: string;
  subtitle: string;
  price: string;
  period?: string;
  yearlyPrice?: string;
  features: string[];
  popular?: boolean;
  ctaText?: string;
  onCtaClick?: () => void;
}

const PricingCard = React.forwardRef<HTMLDivElement, PricingCardProps>(
  ({ 
    resolution, 
    title, 
    subtitle, 
    price, 
    period = '/ месяц', 
    yearlyPrice,
    features, 
    popular = false,
    ctaText = 'Выбрать',
    onCtaClick,
    className, 
    ...props 
  }, ref) => {
    const resolutionStyles = {
      sd: 'hover:border-sd hover:shadow-glow-sd',
      hd: 'hover:border-hd hover:shadow-glow-hd',
      fullhd: 'hover:border-fullhd hover:shadow-glow-fullhd',
      '4k': 'border-4k shadow-[0_0_0_1px_var(--color-4k)_inset,0_0_40px_-10px_rgba(245,158,11,0.4)] hover:shadow-[0_0_0_1px_var(--color-4k)_inset,0_25px_50px_-12px_rgba(245,158,11,0.3)]',
    };

    const resolutionColors = {
      sd: 'text-sd',
      hd: 'text-hd',
      fullhd: 'text-fullhd',
      '4k': 'text-4k',
    };

    const visualPatterns = {
      sd: '∿∿∿∿∿ [∿∿] ∿∿∿∿∿',
      hd: '▓▓░░░░▓▓\n▓░▓▓▓▓░▓',
      fullhd: '┌─┬─┬─┬─┐\n│█│░│█│░│█│',
      '4k': '▪▫▪▫▪▫▪▫\n▫▪▫▪▫▪▫▪',
    };

    return (
      <Card 
        ref={ref} 
        className={cn(
          'flex flex-col relative',
          resolutionStyles[resolution],
          className
        )} 
        {...props}
      >
        {popular && (
          <div className="absolute -top-3 right-6 px-3 py-1 bg-4k text-bg-primary text-xs font-semibold rounded-full">
            Популярный
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2 text-xl font-bold mb-1">
            <span className={resolutionColors[resolution]}>{title}</span>
            <span>{resolution === 'sd' ? '📺' : resolution === 'hd' ? '💻' : resolution === 'fullhd' ? '🖥️' : '🎬'}</span>
          </div>
          <div className="text-sm text-text-secondary">{subtitle}</div>
        </div>

        <div className={cn(
          'h-20 flex items-center justify-center mb-6 rounded-lg bg-bg-secondary border border-border font-mono text-xs whitespace-pre',
          resolutionColors[resolution],
          resolution === 'sd' && 'animate-[sd-noise_2s_ease-in-out_infinite]',
          resolution === 'hd' && 'animate-[hd-pixel_3s_ease-in-out_infinite]',
          resolution === 'fullhd' && 'animate-[fullhd-sharp_2s_ease-out_infinite_alternate]',
          resolution === '4k' && 'animate-[k4-hyper_4s_ease-in-out_infinite]',
        )}>
          {visualPatterns[resolution]}
        </div>

        <div className="mb-6">
          <div className={cn('text-4xl font-bold', resolution === '4k' && 'text-4k')}>{price}</div>
          <div className="text-sm text-text-tertiary">{period}</div>
          {yearlyPrice && (
            <div className="text-xs text-text-muted mt-1">{yearlyPrice}</div>
          )}
        </div>

        <ul className="space-y-2 mb-8 flex-grow">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-accent font-semibold flex-shrink-0">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <Button 
          variant={resolution} 
          className="w-full mt-auto"
          onClick={onCtaClick}
        >
          {ctaText}
        </Button>
      </Card>
    );
  }
);

PricingCard.displayName = 'PricingCard';

export { Card, FeatureCard, PricingCard };

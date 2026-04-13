'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type Resolution = 'sd' | 'hd' | 'fullhd' | '4k';

interface ResolutionVisualProps {
  resolution: Resolution;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const resolutionConfig = {
  sd: {
    color: 'text-sd',
    bg: 'bg-sd/10',
    border: 'border-sd/30',
    animation: 'animate-[sd-noise_3s_ease-in-out_infinite]',
    label: '480p',
  },
  hd: {
    color: 'text-hd',
    bg: 'bg-hd/10',
    border: 'border-hd/30',
    animation: 'animate-[hd-pixel_4s_ease-in-out_infinite]',
    label: '720p',
  },
  fullhd: {
    color: 'text-fullhd',
    bg: 'bg-fullhd/10',
    border: 'border-fullhd/30',
    animation: 'animate-[fullhd-sharp_3s_ease-out_infinite_alternate]',
    label: '1080p',
  },
  '4k': {
    color: 'text-4k',
    bg: 'bg-4k/10',
    border: 'border-4k/30',
    animation: 'animate-[k4-hyper_5s_ease-in-out_infinite]',
    label: '4K',
  },
};

const sizeConfig = {
  sm: 'w-12 h-12 text-xs',
  md: 'w-16 h-16 text-sm',
  lg: 'w-20 h-20 text-base',
};

const ResolutionVisual = React.forwardRef<HTMLDivElement, ResolutionVisualProps>(
  ({ resolution, size = 'md', className }, ref) => {
    const config = resolutionConfig[resolution];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center font-mono font-semibold rounded-lg border',
          config.color,
          config.bg,
          config.border,
          config.animation,
          sizeConfig[size],
          className
        )}
      >
        {config.label}
      </div>
    );
  }
);

ResolutionVisual.displayName = 'ResolutionVisual';

export { ResolutionVisual };
export type { Resolution };

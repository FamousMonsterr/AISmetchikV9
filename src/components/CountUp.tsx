// src/components/CountUp.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export const CountUp = ({ end, duration = 2, className }: CountUpProps) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();
    const durationMs = Math.max(duration, 0.1) * 1000;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const nextValue = end * easeOutCubic(progress);
      setValue(nextValue);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [end, duration]);

  const formattedValue = useMemo(() => {
    if (Number.isInteger(end)) {
      return Math.round(value).toString();
    }
    return value.toFixed(1).replace(/\.0$/, '');
  }, [end, value]);

  return <span className={className}>{formattedValue}</span>;
};

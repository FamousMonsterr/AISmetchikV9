// src/components/CountUp.tsx
"use client";
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
}

export const CountUp = ({ end, duration = 2, className }: CountUpProps) => {  
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, end, {
      duration: duration,
      ease: "easeOut",
    });
    return controls.stop;
  }, [end, duration, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
};

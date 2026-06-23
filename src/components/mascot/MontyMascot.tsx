'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MONTY_ANIMATIONS, type MontyAnimation } from './animations';

interface MontyMascotProps {
  /** Текущая анимация */
  animation?: MontyAnimation;
  /** Размер в пикселях */
  size?: number;
  /** Показывать подпись */
  showLabel?: boolean;
  /** Дополнительные CSS классы */
  className?: string;
  /** Автосмена анимации */
  autoRotate?: boolean;
  /** Интервал автосмены (мс) */
  rotateInterval?: number;
  /** Обработчик клика */
  onClick?: () => void;
}

const ANIMATION_LABELS: Record<MontyAnimation, string> = {
  wave: '👋 Привет!',
  idea: '💡 Идея!',
  work: '🔧 Работаю...',
  done: '✅ Готово!',
  think: '🤔 Думаю...',
  celebrate: '🎉 Ура!',
  sleep: '😴 Отдыхаю...',
  analyze: '📊 Аналитика',
  search: '🔍 Ищу...',
  launch: '🚀 Старт!',
};

export function MontyMascot({
  animation = 'wave',
  size = 120,
  showLabel = false,
  className = '',
  autoRotate = false,
  rotateInterval = 3000,
  onClick,
}: MontyMascotProps) {
  const [current, setCurrent] = useState<MontyAnimation>(animation);
  const keys = Object.keys(MONTY_ANIMATIONS) as MontyAnimation[];

  useEffect(() => {
    setCurrent(animation);
  }, [animation]);

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setCurrent((prev) => {
        const idx = keys.indexOf(prev);
        return keys[(idx + 1) % keys.length];
      });
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [autoRotate, rotateInterval, keys]);

  const src = MONTY_ANIMATIONS[current];

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Image
        src={src}
        alt="Масскод Монти"
        width={size}
        height={size}
        className="drop-shadow-lg transition-all duration-300"
        unoptimized // SVG animations
        priority
      />
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground animate-fade-in">
          {ANIMATION_LABELS[current]}
        </span>
      )}
    </div>
  );
}

/** Мини-версия для инлайн-использования */
export function MontyInline({
  animation = 'wave',
  size = 32,
}: Pick<MontyMascotProps, 'animation' | 'size'>) {
  return (
    <Image
      src={MONTY_ANIMATIONS[animation]}
      alt="Монти"
      width={size}
      height={size}
      className="inline-block align-middle"
      unoptimized
    />
  );
}

/** Аватар маскота (статичный) */
export function MontyAvatar({
  size = 48,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/mascot/monty.svg"
      alt="Масскод Монти"
      width={size}
      height={size}
      className={`rounded-full border-2 border-yellow-400 shadow-md ${className}`}
      unoptimized
    />
  );
}

'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import Link from 'next/link';

interface NavigationProps {
  className?: string;
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ className }, ref) => {
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 100);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
      <nav
        ref={ref}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 px-8 py-4 transition-all duration-250',
          scrolled ? 'bg-bg-primary/95' : 'bg-bg-primary/80',
          'backdrop-blur-xl border-b border-border',
          className
        )}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-accent to-sd bg-clip-text text-transparent"
          >
            AI Сметчик
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Возможности
            </Link>
            <Link href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Тарифы
            </Link>
            <Link href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Как работает
            </Link>
          </div>

          <Link 
            href="#pricing" 
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            Начать
          </Link>
        </div>
      </nav>
    );
  }
);

Navigation.displayName = 'Navigation';

export { Navigation };

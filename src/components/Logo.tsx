// src/components/Logo.tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";

const logoVariants = cva(
  "text-xl border-2 rounded-full px-1",
  {
    variants: {
      variant: {
        default: "border-primary text-primary",
        partnership: "border-amber-500 text-amber-500",
        partnerDashboard: "border-yellow-500 text-yellow-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface LogoProps extends VariantProps<typeof logoVariants> {
  href?: string;
  className?: string;
}

export const Logo = ({ href = "/", variant, className }: LogoProps) => {
  return (
    <Link
      href={href}
      className={cn("relative z-20 flex items-center space-x-2 py-1 px-2 text-lg font-bold tracking-wider", className)}
    >
       <span className={cn(logoVariants({ variant }))}>AI</span>
       <span className="logo-text-smetchik text-xl">Сметчик</span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center justify-center space-x-2 py-1 px-2 text-sm font-bold"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground">
        <span className="text-sm font-bold">АИ</span>
      </div>
    </Link>
  );
};

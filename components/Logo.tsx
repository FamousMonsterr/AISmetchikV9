// src/components/Logo.tsx
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const logoMarkVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full bg-white/90 ring-1 ring-inset dark:bg-slate-950/80",
  {
    variants: {
      variant: {
        default: "ring-primary/40",
        partnership: "ring-amber-500/40",
        partnerDashboard: "ring-yellow-500/40",
      },
      size: {
        sm: "h-7 w-7",
        md: "h-8 w-8",
        lg: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface LogoProps extends VariantProps<typeof logoMarkVariants> {
  href?: string;
  className?: string;
}

export const Logo = ({ href = "/", variant, className }: LogoProps) => {
  return (
    <Link
      href={href}
      className={cn("relative z-20 flex items-center space-x-2 py-1 px-2 text-lg font-bold tracking-wider", className)}
    >
      <span className={cn(logoMarkVariants({ variant }))}>
        <Image
          src="/brand/ai-smetchik-logo.svg"
          alt="Логотип AI Сметчик"
          width={80}
          height={80}
          className="h-full w-full object-contain"
          sizes="(max-width: 640px) 28px, 32px"
          priority
        />
      </span>
      <span className="logo-text-smetchik text-xl">Сметчик</span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center justify-center space-x-2 py-1 px-2 text-sm font-bold"
      aria-label="AI Сметчик"
    >
      <span className={cn(logoMarkVariants({ size: "sm" }))}>
        <Image
          src="/brand/ai-smetchik-logo.svg"
          alt="Логотип AI Сметчик"
          width={56}
          height={56}
          className="h-full w-full object-contain"
          sizes="28px"
        />
      </span>
    </Link>
  );
};

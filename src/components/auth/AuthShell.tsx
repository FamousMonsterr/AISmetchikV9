"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideDescription: string;
  highlights: Array<{ title: string; description: string }>;
  status: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideDescription,
  highlights,
  status,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-foreground/5 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden flex-col justify-between rounded-[32px] border border-border bg-white/5 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
            <div className="space-y-6">
              <Logo href="/" className="px-0 text-foreground" />
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">{eyebrow}</p>
                <h1 className="max-w-lg text-4xl font-semibold leading-tight text-white">{asideTitle}</h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">{asideDescription}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="rounded-2xl border border-border bg-white/5 p-4"
                >
                  <p className="text-sm font-medium text-white">{highlight.title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{highlight.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-border bg-background/92 text-foreground shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400" />
            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <Logo href="/" className="px-0 text-foreground" />
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  {status}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">{title}</h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>

              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// src/app/legal/layout.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Button onClick={() => router.back()} variant="ghost">
             <ArrowLeft className="mr-2 h-4 w-4"/>
             Вернуться назад
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-8">
        {children}
      </main>
      <footer className="py-8 border-t mt-8">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} Montage HUB. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}

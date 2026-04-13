"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export const VideoSection = () => {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="py-10">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">Узнайте больше за две минуты</h2>
          <p className="mt-2 text-muted-foreground">
            Короткое видео-приглашение в партнёрскую программу без визуального шума и рекламной истерики.
          </p>
        </div>
        <GlassCard interactive={false}>
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted/50">
              {videoFailed ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="px-6 text-center text-muted-foreground">
                    <PlayCircle className="mx-auto mb-3 h-14 w-14 opacity-40" />
                    <p className="text-sm">
                      Секция готова под Sora-видео для партнёрской страницы. Ожидаемый файл:
                    </p>
                    <p className="mt-2 font-mono text-xs">/public/media/ai-smetchik-partnership-32s.mp4</p>
                  </div>
                </div>
              ) : (
                <video
                  className="h-full w-full object-cover"
                  src="/media/ai-smetchik-partnership-32s.mp4"
                  poster="/media/ai-smetchik-partnership-poster.png"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  onError={() => setVideoFailed(true)}
                />
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
};

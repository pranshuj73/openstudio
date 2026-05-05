import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(139,92,246,0.18),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <section className="relative flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-7 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-400/20 bg-gradient-to-br from-violet-500/18 to-indigo-500/8 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
              <div className="h-2.5 w-2.5 rounded-[0.25rem] bg-gradient-to-br from-violet-300 to-indigo-400" />
            </div>
            <p className="font-mono text-sm font-semibold tracking-tight text-foreground">
              openstudio
            </p>
          </div>

          <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-[-0.075em] sm:text-6xl md:text-[4.6rem] md:leading-[0.96]">
            An opinionated web-based editor
            <br />
            for product demo videos.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Built for teams who need to turn raw recordings into clear walkthroughs with less
            decision fatigue, tighter motion control, and a cleaner editing surface.
          </p>

          <Button size="lg" className="mt-10 font-mono" asChild>
            <Link href="/editor">
              try early beta
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

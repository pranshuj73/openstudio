import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(139,92,246,0.18),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      <Link className="absolute top-6 right-6 z-10 opacity-50 hover:opacity-95 transition-all ease-in-out duration-200" href="https://github.com/pranshuj73/openstudio" rel="noopener" target="_blank">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="size-6" viewBox="0 0 16 16">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
        </svg>
      </Link>

      <section className="relative flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-400/20 bg-linear-to-br from-violet-500/18 to-indigo-500/8 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
              <div className="h-2.5 w-2.5 rounded-lg bg-linear-to-br from-violet-300 to-indigo-400" />
            </div>
            <p className="font-mono text-sm font-semibold tracking-tight text-foreground">
              openstudio
            </p>
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-[-0.075em] sm:text-6xl md:text-[4.6rem] md:leading-tight">
            An opinionated <span className="text-nowrap">web-based editor</span>
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

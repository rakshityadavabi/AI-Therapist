import { ShieldCheck } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Progress } from './ui/Progress';
import { cn } from '@/lib/utils';

export function AppShell({ progress = 0, children, contentClassName }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--color-ink)] focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[var(--color-border-soft)]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <BrandMark />
          <div className="hidden sm:flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Privacy-first · runs locally in your browser</span>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main
        id="main-content"
        className={cn('flex-1 w-full', contentClassName)}
      >
        {children}
      </main>

      <footer className="border-t border-[var(--color-border-soft)] bg-white/60">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-faint)]">
          <span>AI Therapist · Multi-modal mental-health screening demo</span>
          <span>Educational use only · Not a medical device</span>
        </div>
      </footer>
    </div>
  );
}

import { cn } from '@/lib/utils';

const TONE_CLASSES = {
  primary: 'bg-[var(--color-primary)]',
  coral: 'bg-[var(--color-coral)]',
  amber: 'bg-[var(--color-amber)]',
  muted: 'bg-[var(--color-faint)]',
};

export function StatusDot({ tone = 'primary', pulse = false, className }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.5)]',
        TONE_CLASSES[tone] || TONE_CLASSES.primary,
        className
      )}
      style={pulse ? { animation: 'mindscope-pulse 1.2s ease-in-out infinite' } : undefined}
    />
  );
}

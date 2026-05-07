import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const TONE_CLASSES = {
  neutral: 'bg-[var(--color-border-soft)] text-[var(--color-muted)]',
  primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]',
  amber: 'bg-[var(--color-amber-soft)] text-[#8a6516] border border-[var(--color-amber-border)]',
  coral: 'bg-[var(--color-coral-soft)] text-[#8b2a26] border border-[var(--color-coral-border)]',
  outline: 'bg-white text-[var(--color-muted)] border border-[var(--color-border)]',
  filled: 'bg-[var(--color-primary)] text-white',
};

const Pill = forwardRef(({ className, tone = 'neutral', size = 'md', children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide',
      size === 'sm' && 'text-[10px] px-2 py-0.5 uppercase tracking-[0.06em]',
      size === 'md' && 'text-[11px] px-2.5 py-1 uppercase tracking-[0.06em]',
      size === 'lg' && 'text-xs px-3 py-1.5',
      TONE_CLASSES[tone] || TONE_CLASSES.neutral,
      className
    )}
    {...props}
  >
    {children}
  </span>
));
Pill.displayName = 'Pill';

export { Pill };

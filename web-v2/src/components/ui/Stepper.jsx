import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact horizontal stepper showing progress across the screening flow.
 *
 * steps: [{ id, label, icon? }]
 * activeIndex: number
 */
export function Stepper({ steps, activeIndex, className }) {
  return (
    <ol
      className={cn(
        'flex items-center justify-center flex-wrap gap-y-2 max-w-3xl mx-auto',
        className
      )}
      aria-label="Screening progress"
    >
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step.id} className="flex items-center min-w-0">
            <div className="flex items-center gap-2 px-2">
              <span
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors',
                  done && 'bg-[var(--color-primary)] text-white',
                  active && 'bg-white text-[var(--color-primary)] border-2 border-[var(--color-primary)] shadow-[var(--shadow-soft)]',
                  !done && !active && 'bg-white text-[var(--color-faint)] border border-[var(--color-border)]'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.icon ?? i + 1}
              </span>
              <span
                className={cn(
                  'text-[12px] font-semibold tracking-wide whitespace-nowrap',
                  active ? 'text-[var(--color-ink)]' : done ? 'text-[var(--color-muted)]' : 'text-[var(--color-faint)]'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'h-px w-8 sm:w-12 mx-0.5 transition-colors',
                  done ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

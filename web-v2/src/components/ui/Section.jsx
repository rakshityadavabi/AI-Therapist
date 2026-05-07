import { cn } from '@/lib/utils';

export function Section({ className, children, eyebrow, title, description, action }) {
  return (
    <section className={cn('space-y-4 animate-[mindscope-fade-up_0.45s_ease-out]', className)}>
      {(eyebrow || title || description || action) && (
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            {title && (
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--color-muted)] mt-1 max-w-xl">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

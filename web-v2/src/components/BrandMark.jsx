import { cn } from '@/lib/utils';

/**
 * Wordmark + icon for AI Therapist.
 *
 * The mark is a soft squircle with a sage gradient containing a single-stroke
 * "heart + heartbeat" glyph — caring (heart), attentive (pulse), modern (gradient).
 * The unique gradient ID prevents collisions if multiple BrandMarks render.
 */
let uid = 0;

export function BrandMark({ className, showWordmark = true, size = 32 }) {
  const gradId = `bm-grad-${++uid}`;
  const sparkGradId = `bm-spark-${uid}`;

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#52BFB0" />
            <stop offset="100%" stopColor="#2F8C7E" />
          </linearGradient>
          <radialGradient id={sparkGradId} cx="0.3" cy="0.25" r="0.8">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Squircle container with gradient + soft inner highlight */}
        <rect x="1" y="1" width="30" height="30" rx="9" ry="9" fill={`url(#${gradId})`} />
        <rect x="1" y="1" width="30" height="30" rx="9" ry="9" fill={`url(#${sparkGradId})`} />

        {/* Heart outline */}
        <path
          d="M16 23.4c-.7 0-1.3-.27-1.85-.78L8.42 17.2a4.7 4.7 0 0 1-1.42-3.36 4.55 4.55 0 0 1 4.6-4.5 4.5 4.5 0 0 1 3.4 1.55c.28.32.56.7.78 1.06.07.12.2.12.27 0 .22-.36.5-.74.78-1.06A4.5 4.5 0 0 1 20.4 9.34a4.55 4.55 0 0 1 4.6 4.5 4.7 4.7 0 0 1-1.42 3.36l-5.74 5.42c-.54.51-1.14.78-1.84.78Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Heartbeat / pulse line cutting across the heart */}
        <path
          d="M7.5 16.4h2.6l1.4-2.6 1.6 4.4 1.6-3 1.4 1.2h6.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tiny "AI" spark dot — top-right */}
        <circle cx="24.5" cy="8" r="1.6" fill="#ffffff" opacity="0.95" />
        <circle cx="24.5" cy="8" r="3.2" fill="#ffffff" opacity="0.18" />
      </svg>

      {showWordmark && (
        <div className="leading-none">
          <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-[var(--color-ink)]">
            AI Therapist
          </span>
        </div>
      )}
    </div>
  );
}

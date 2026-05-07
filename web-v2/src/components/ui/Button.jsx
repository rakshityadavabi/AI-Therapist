import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-ring)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-primary-hover)]',
        secondary:
          'bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[#f0f4f3]',
        ghost:
          'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/60',
        link:
          'bg-transparent text-[var(--color-primary)] hover:underline underline-offset-4 px-0 py-0 h-auto rounded-none focus-visible:ring-0',
        danger:
          'bg-[var(--color-coral)] text-white hover:opacity-90',
        outline:
          'bg-white text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/40',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };

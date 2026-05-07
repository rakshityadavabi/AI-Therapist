import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n, fractionDigits = 0) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export const RISK_COLORS = {
  Low: 'var(--color-risk-low)',
  Moderate: 'var(--color-risk-moderate)',
  Elevated: 'var(--color-risk-elevated)',
  High: 'var(--color-risk-high)',
};

export const DSM_COLOR_VARS = [
  'var(--color-risk-low)',
  '#a4c95f',
  'var(--color-risk-moderate)',
  'var(--color-risk-elevated)',
  'var(--color-risk-high)',
];

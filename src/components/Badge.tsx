import type { HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-bg text-ink-soft border-line',
  accent: 'bg-panel text-accent border-accent',
  success: 'bg-panel text-green-700 border-green-600',
  warning: 'bg-banner text-banner-ink border-banner-ink/30',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className = '', ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...rest}
    />
  );
}

import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Selectable chip (filter/toggle). Renders as a button with aria-pressed. */
export function Chip({ selected = false, className = '', type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors ${
        selected ? 'border-dark bg-dark text-white' : 'border-line bg-panel text-ink hover:bg-bg'
      } ${className}`}
      {...rest}
    />
  );
}

import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  actions?: ReactNode;
}

export function Card({ title, actions, children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-panel p-4 shadow-sm ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

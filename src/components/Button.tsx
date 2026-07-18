import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-dark text-white hover:bg-dark-2',
  secondary: 'border border-line bg-panel text-ink hover:bg-bg',
  ghost: 'bg-transparent text-ink hover:bg-bg',
  danger: 'bg-accent text-white hover:opacity-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
});

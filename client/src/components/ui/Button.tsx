'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  lift?: boolean;
  fullWidth?: boolean;
};

export default function Button({
  variant = 'primary',
  lift = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: Props) {
  const base =
    'px-6 py-3 rounded-sm text-base font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed';

  const width = fullWidth ? 'w-full' : '';

  const variants: Record<Variant, string> = {
    primary: `bg-sage text-white hover:bg-sage-hover ${lift ? 'hover:-translate-y-px disabled:hover:translate-y-0' : ''}`,
    secondary: 'bg-transparent border border-divider text-text-primary hover:bg-base',
    danger: 'bg-urgent text-white hover:opacity-90',
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${width} ${variants[variant]} ${className}`}
    />
  );
}
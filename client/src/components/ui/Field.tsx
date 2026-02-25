'use client';

import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-sm border border-divider bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage transition';

type Props = {
  label?: ReactNode; // ✅ was string — now supports JSX
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: Props) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-2 text-sage font-semibold mb-2"
        >
          <span className="w-1 h-4 bg-terracotta rounded-sm" />
          <span>{label}</span>
        </label>
      )}

      {children}

      {hint && !error && <div className="mt-2 text-xs text-text-secondary">{hint}</div>}
      {error && <div className="mt-2 text-xs text-urgent">{error}</div>}
    </div>
  );
}

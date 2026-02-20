'use client';

import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
};

export default function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-sage flex items-center gap-2"
      >
        <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
        {label}
        {required && <span className="text-urgent">*</span>}
      </label>

      {children}

      {hint && !error && <div className="text-xs text-text-secondary">{hint}</div>}
      {error && <div className="text-sm text-urgent">{error}</div>}
    </div>
  );
}

export const inputClass =
  'w-full px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition ' +
  'placeholder:text-text-secondary/60 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10 ' +
  'disabled:opacity-70';
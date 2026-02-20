'use client';

import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  ariaLabel: string;
  isBlocking?: boolean; 
  maxWidthClassName?: string; 
  onClose: () => void;
  children: ReactNode;
};

export default function BaseModal({
  open,
  title,
  subtitle,
  ariaLabel,
  isBlocking = false,
  maxWidthClassName = 'max-w-[560px]',
  onClose,
  children,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isBlocking) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isBlocking) onClose();
      }}
      tabIndex={-1}
    >
      <div
        className={`w-full ${maxWidthClassName} bg-surface rounded-md shadow-lg border border-divider p-8`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="mb-6 pb-6 border-b-4 border-sage">
            {title && (
              <h2 className="text-2xl font-heading font-semibold text-sage">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
'use client';

import type { ReactNode } from 'react';
import BaseModal from '@/components/modals/BaseModal';

type DeleteConfirmModalProps = {
    open: boolean;
    ariaLabel?: string;
    itemLabel?: string;
    title?: string;
    subtitle?: string;
    warningMessage?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDeleting?: boolean;
    isBlocking?: boolean;
    maxWidthClassName?: string;
    preview?: ReactNode;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
};

export default function DeleteConfirmModal({
    open,
    ariaLabel,
    itemLabel = 'item',
    title,
    subtitle = 'This action cannot be undone.',
    warningMessage,
    confirmLabel,
    cancelLabel = 'Cancel',
    isDeleting = false,
    isBlocking,
    maxWidthClassName = 'max-w-[560px]',
    preview,
    onClose,
    onConfirm,
}: DeleteConfirmModalProps) {
    const resolvedTitle = title ?? `Delete ${itemLabel}?`;
    const resolvedAriaLabel = ariaLabel ?? resolvedTitle;
    const resolvedWarningMessage =
        warningMessage ??
        `Are you sure you want to permanently delete this ${itemLabel}? Any associated data may also be removed.`;
    const resolvedConfirmLabel = confirmLabel ?? `Delete ${itemLabel}`;

    return (
        <BaseModal
            open={open}
            title={resolvedTitle}
            subtitle={subtitle}
            ariaLabel={resolvedAriaLabel}
            onClose={onClose}
            isBlocking={isBlocking ?? isDeleting}
            maxWidthClassName={maxWidthClassName}
        >
            <div className="flex flex-col gap-6">
                <div className="rounded-md border border-urgent/25 bg-urgent/5 px-5 py-5">
                    <div className="flex items-start gap-3">
                        <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-urgent"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg" //what 
                            aria-hidden="true"
                        >
                            <path
                                d="M10 2.75L18 17H2L10 2.75Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M10 7.4V11.1"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                            />
                            <circle cx="10" cy="14.1" r="0.9" fill="currentColor" />
                        </svg>

                        <p className="text-sm leading-7 text-urgent">
                            {resolvedWarningMessage}
                        </p>
                    </div>
                </div>

                {preview && (
                    <div className="rounded-md border border-divider bg-base px-5 py-4">
                        {preview}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-sm border border-divider bg-surface text-text-primary font-medium transition-all hover:bg-base hover:border-sage disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-sm border border-urgent bg-urgent text-white font-medium transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? 'Deleting...' : resolvedConfirmLabel}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
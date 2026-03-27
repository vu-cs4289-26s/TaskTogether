'use client';

import { useEffect, type ReactNode } from 'react';


type Props = {
    open: boolean;
    title?: string;
    subtitle?: string;
    header?: ReactNode;
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
    header,
    ariaLabel,
    isBlocking = false,
    maxWidthClassName = 'max-w-[560px]',
    onClose,
    children,
}: Props) {

    //added to freeze background. 
    useEffect(() => {
    if (!open) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        return;
    }

    const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    };
}, [open]);
//new code ends here

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/40 flex items-start justify-center px-4 py-10 overflow-y-auto"
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
                className={`w-full ${maxWidthClassName} bg-surface rounded-md shadow-lg border border-divider p-8 my-auto`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {(header || title || subtitle) && (
                    <div className="mb-6 pb-6 border-b-4 border-sage">
                        {header ? (
                            header
                        ) : (
                            <>
                                {title && (
                                    <h2 className="text-2xl font-heading font-semibold text-sage">
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
                                    <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}
'use client';

import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';
import type { Issue, IssueType } from '@/types/issues';

type Props = {
    open: boolean;
    issue: Issue | null;
    isDeleting?: boolean;
    onClose: () => void;
    onConfirm: (issueId: string) => void | Promise<void>;
};

function humanizeEnum(value: string) {
    return value.replace(/_/g, ' ');
}

function statusBadgeClasses(status: Issue['status']) {
    switch (status) {
        case 'OPEN':
            return 'bg-urgent/10 text-urgent border-urgent';
        case 'IN_PROGRESS':
            return 'bg-pending/10 text-pending border-pending';
        case 'RESOLVED':
            return 'bg-sage/10 text-sage border-sage';
        case 'ARCHIVED':
            return 'bg-base text-text-secondary border-divider';
        default:
            return 'bg-base text-text-secondary border-divider';
    }
}

function priorityPillClasses(priority: Issue['priority']) {
    switch (priority) {
        case 'URGENT':
            return 'border-urgent bg-urgent/10 text-urgent';
        case 'MEDIUM':
            return 'border-pending bg-pending/10 text-pending';
        case 'LOW':
            return 'border-success bg-success/10 text-success';
        default:
            return 'border-divider bg-base text-text-secondary';
    }
}

export default function IssueDeleteModal({
    open,
    issue,
    isDeleting = false,
    onClose,
    onConfirm,
}: Props) {
    return (
        <DeleteConfirmModal
            open={open}
            itemLabel="issue"
            warningMessage="Are you sure you want to permanently delete this issue? All associated data will be removed for every member of the household."
            isDeleting={isDeleting}
            onClose={onClose}
            onConfirm={() => {
                if (issue) return onConfirm(issue.id);
            }}
            preview={
                issue && (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-text-primary break-words">
                                {issue.title}
                            </h3>

                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold border-divider bg-base text-text-primary`}
                            >
                                {humanizeEnum(issue.type)}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityPillClasses(
                                    issue.priority
                                )}`}
                            >
                                {humanizeEnum(issue.priority)}
                            </span>

                            <span className="opacity-60">•</span>

                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                                    issue.status
                                )}`}
                            >
                                {humanizeEnum(issue.status)}
                            </span>
                        </div>

                        {issue.description && (
                            <p className="mt-3 text-sm leading-6 text-text-secondary">
                                {issue.description}
                            </p>
                        )}
                    </div>
                )
            }
        />
    );
}
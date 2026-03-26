'use client';

import type { Issue } from '@/types/issues';

interface IssueCardProps {
    issue: Issue;
    onClick?: (issue: Issue) => void;
    variant?: 'dashboard' | 'full';
}

function humanizeEnum(value: string) {
    return value.replace(/_/g, ' ');
}

function statusClasses(status: Issue['status']) {
    switch (status) {
        case 'OPEN':
            return 'bg-urgent/10 text-urgent border-urgent';
        case 'IN_PROGRESS':
            return 'bg-pending/10 text-pending border-pending';
        case 'RESOLVED':
            return 'bg-success/10 text-success border-success';
        case 'ARCHIVED':
            return 'bg-base text-text-secondary border-divider';
        default:
            return 'bg-base text-text-secondary border-divider';
    }
}

function priorityBorderClasses(priority: Issue['priority']) {
    switch (priority) {
        case 'URGENT':
            return 'border-l-urgent';
        case 'MEDIUM':
            return 'border-l-pending';
        case 'LOW':
            return 'border-l-success';
        default:
            return 'border-l-sage';
    }
}

export default function IssueCard({ issue, onClick, variant }: IssueCardProps) {
    const reporterName = issue.isAnonymous
        ? 'Anonymous'
        : issue.reportedBy?.name ?? 'Unknown';

    const isDashboard = variant === 'dashboard';


    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onClick?.(issue)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(issue);
                }
            }}
            className={`
                cursor-pointer rounded-md border border-divider transition-all
                ${isDashboard
                    ? 'bg-base  hover:-translate-y-px hover:shadow-md  p-4'
                    : 'bg-surface shadow-sm hover:-translate-y-px hover:shadow-md p-5'}
                border-l-4 ${priorityBorderClasses(issue.priority)}

            `}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h2
                        className={`truncate font-semibold text-text-primary ${isDashboard ? 'text-base' : 'text-sm'
                            }`}
                    >
                        {issue.title}
                    </h2>

                    <div
                        className={`mt-1 flex flex-wrap items-center gap-2 text-text-secondary ${isDashboard ? 'text-sm' : 'text-xs'
                            }`}
                    >
                        <span>{reporterName}</span>
                        <span>•</span>
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <span
                    className={`shrink-0 inline-flex items-center rounded-sm border font-semibold ${isDashboard ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'
                        } ${statusClasses(issue.status)}`}
                >
                    {humanizeEnum(issue.status)}
                </span>
            </div>
        </div>
    );
}
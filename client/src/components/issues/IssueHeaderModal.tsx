'use client';

import type { Issue } from '@/types/issues';
import {
    humanizeEnum,
    priorityPillClasses,
    statusBadgeClasses,
} from '@/lib/issues-display';

type Props = {
    issue: Issue;
};

export default function IssueModalHeader({ issue }: Props) {
    const reporterName = issue.isAnonymous
        ? 'Anonymous'
        : issue.reportedBy?.name ?? 'Unknown';

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-2xl font-heading font-semibold text-sage break-words">
                    {issue.title}
                </h2>

                <div className="mt-2 text-sm text-text-secondary flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-primary">
                        {humanizeEnum(issue.type)}
                    </span>
                    <span className="opacity-60">•</span>
                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span className="opacity-60">•</span>
                    <span className="inline-flex items-center gap-2">
                        <span>Reported by</span>
                        <span className="font-medium text-text-primary">{reporterName}</span>
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                <span
                    className={`px-2 py-1 rounded text-[11px] font-semibold uppercase border ${statusBadgeClasses(
                        issue.status
                    )}`}
                >
                    {humanizeEnum(issue.status)}
                </span>

                <span
                    className={`px-2 py-1 rounded text-[11px] font-semibold uppercase border ${priorityPillClasses(
                        issue.priority
                    )}`}
                >
                    {humanizeEnum(issue.priority)}
                </span>
            </div>
        </div>
    );
}
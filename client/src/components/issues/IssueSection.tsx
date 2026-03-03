'use client';

import { useEffect, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import ReportIssueModal, { type ReportIssueFormValues } from '@/components/modals/ReportIssueModal';
import IssueDetailPanel from './IssueDetailPanel';


import {
    createIssueApi,
    listIssuesApi,
    deleteIssueApi,
    updateIssueApi,
} from '@/lib/issues.api';

import type { Issue, IssueType, IssueStatus, IssuePriority, UpdateIssueInput } from '@/types/issues';

type Props = {
    householdId: string;
    isAdmin: boolean;
    initialIssues?: Issue[];
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

// UI -> DB mapping (matches your schema enums)
const typeMap: Record<ReportIssueFormValues['type'], IssueType> = {
    maintenance: 'MAINTENANCE',
    conflict: 'HOUSEMATE_CONFLICT',
    noise: 'NOISE_COMPLAINT',
    cleanliness: 'CLEANLINESS',
    other: 'OTHER',
};

const priorityMap: Record<ReportIssueFormValues['priority'], IssuePriority> = {
    urgent: 'URGENT',
    medium: 'MEDIUM',
    low: 'LOW',
};

// DB -> UI mapping (for edit prefill)
function dbTypeToUi(t: IssueType): ReportIssueFormValues['type'] {
    switch (t) {
        case 'MAINTENANCE':
            return 'maintenance';
        case 'HOUSEMATE_CONFLICT':
            return 'conflict';
        case 'NOISE_COMPLAINT':
            return 'noise';
        case 'CLEANLINESS':
            return 'cleanliness';
        case 'OTHER':
        default:
            return 'other';
    }
}

function dbPriorityToUi(p: IssuePriority): ReportIssueFormValues['priority'] {
    switch (p) {
        case 'URGENT':
            return 'urgent';
        case 'LOW':
            return 'low';
        case 'MEDIUM':
        default:
            return 'medium';
    }
}

function issueToForm(issue: Issue): ReportIssueFormValues {
    return {
        title: issue.title ?? '',
        type: dbTypeToUi(issue.type),
        priority: dbPriorityToUi(issue.priority),
        description: issue.description ?? '',
        anonymous: Boolean(issue.isAnonymous),
    };
}

function toUpdateIssueInput(values: ReportIssueFormValues): UpdateIssueInput {
    const trimmedTitle = values.title.trim();

    return {
        title: trimmedTitle,
        description: values.description?.trim() ? values.description.trim() : null,
        type: typeMap[values.type],
        priority: priorityMap[values.priority],
        isAnonymous: Boolean(values.anonymous),
        // photoUrl: null // keep as-is until you implement uploads
    } as UpdateIssueInput;
}

function IssueModalHeader({ issue }: { issue: Issue }) {
    const reporterName = issue.isAnonymous ? 'Anonymous' : issue.reportedBy?.name ?? 'Unknown';

    return (
        <div className="flex items-start justify-between gap-4">
            {/* Left: title + meta ABOVE divider */}
            <div className="min-w-0">
                <h2 className="text-2xl font-heading font-semibold text-sage break-words">
                    {issue.title}
                </h2>

                <div className="mt-2 text-sm text-text-secondary flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-primary">{humanizeEnum(issue.type)}</span>
                    <span className="opacity-60">•</span>
                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span className="opacity-60">•</span>
                    <span className="inline-flex items-center gap-2">
                        <span>Reported by</span>
                        <span className="font-medium text-text-primary">{reporterName}</span>
                    </span>
                </div>
            </div>

            {/* Right: tags on their own lines */}
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

export default function IssuesSection({ householdId, isAdmin, initialIssues = [] }: Props) {
    const [issues, setIssues] = useState<Issue[]>(initialIssues);

    // Create modal
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Edit modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Issue | null>(null);

    // Shared submit state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Detail modal
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // For now: ONLY admins can edit
    const canEdit = isAdmin;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { issues: fresh } = await listIssuesApi(householdId);
                if (!cancelled) setIssues(fresh);
            } catch (err) {
                console.error('Failed to load issues:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [householdId]);

    function openDetail(issue: Issue) {
        setSelectedIssue(issue);
        setIsDetailOpen(true);
    }

    async function handleStatusChange(issueId: string, status: IssueStatus) {
        const updated = await updateIssueApi(householdId, issueId, { status });

        setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setSelectedIssue(updated);
    }

    function handleEditClick(issue: Issue) {
        // close the view modal
        setIsDetailOpen(false);

        // open the edit modal
        setEditTarget(issue);
        setIsEditOpen(true);

        setSubmitError(null);
    }

    async function handleDelete(issueId: string) {
        await deleteIssueApi(householdId, issueId);

        setIssues((prev) => prev.filter((i) => i.id !== issueId));

        setIsDetailOpen(false);
        setSelectedIssue(null);
    }

    async function handleCreate(values: ReportIssueFormValues) {
        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const created = await createIssueApi(householdId, {
                title: values.title,
                type: values.type,
                priority: values.priority,
                description: values.description, 
                anonymous: values.anonymous,
                photoUrl: null, // until wire photos
            });

            setIssues((prev) => [created, ...prev]);
            setIsReportOpen(false);

        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to submit issue.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleEditSubmit(values: ReportIssueFormValues) {
        if (!editTarget) return;

        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const payload = toUpdateIssueInput(values);

            const updated = await updateIssueApi(householdId, editTarget.id, payload);

            setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setSelectedIssue(updated);

            setIsEditOpen(false);
            setEditTarget(null);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to update issue.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="lg:col-span-2 bg-surface rounded-md p-6 shadow-sm border border-divider">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
                <h2 className="text-xl font-semibold text-sage">Report Issues</h2>

                <button
                    type="button"
                    onClick={() => {
                        setIsReportOpen(true);
                        setSubmitError(null);
                    }}
                    className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Report Issue
                </button>
            </div>

            {/* Issue List */}
            <div className="flex flex-col gap-4">
                {issues.length === 0 ? (
                    <div className="text-text-secondary text-sm py-2">No issues yet.</div>
                ) : (
                    issues.map((issue) => (
                        <div
                            key={issue.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openDetail(issue)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') openDetail(issue);
                            }}
                            className="p-4 border-l-4 border-l-sage rounded-sm bg-base cursor-pointer transition-all hover:border-sage hover:shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold">{issue.title}</span>
                                <span className="px-2 py-1 rounded text-[11px] font-semibold uppercase border bg-urgent/10 text-urgent border-urgent">
                                    {issue.status}
                                </span>
                            </div>

                            <div className="flex gap-4 text-[13px] text-text-secondary flex-wrap">
                                <span>
                                    Reported by {issue.isAnonymous ? 'Anonymous' : issue.reportedBy?.name ?? 'Unknown'}
                                </span>
                                <span>&bull;</span>
                                <span>{new Date(issue.createdAt).toLocaleString()}</span>
                                <span>&bull;</span>
                                <span>
                                    {issue.comments.length} comment{issue.comments.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Issue Modal */}
            <ReportIssueModal
                open={isReportOpen}
                isSubmitting={isSubmitting}
                error={submitError}
                onClose={() => {
                    if (isSubmitting) return;
                    setIsReportOpen(false);
                    setSubmitError(null);
                }}
                onSubmit={handleCreate}
            />

            {/* Edit Issue Modal (admin only for now) */}
            <ReportIssueModal
                open={isEditOpen}
                mode="edit"
                initialValue={editTarget ? issueToForm(editTarget) : undefined}
                isSubmitting={isSubmitting}
                error={submitError}
                onClose={() => {
                    if (isSubmitting) return;
                    setIsEditOpen(false);
                    setEditTarget(null);
                    setSubmitError(null);
                }}
                onSubmit={handleEditSubmit}
            />

            {/* Detail Modal */}
            <BaseModal
                open={isDetailOpen}
                ariaLabel={selectedIssue ? `Issue details: ${selectedIssue.title}` : 'Issue details'}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedIssue(null);
                }}
                maxWidthClassName="max-w-[760px]"
            >
                {selectedIssue && (
                    <div className="mb-6 pb-6 border-b-4 border-sage">
                        <IssueModalHeader issue={selectedIssue} />
                    </div>
                )}

                {selectedIssue && (
                    <IssueDetailPanel
                        issue={selectedIssue}
                        isAdmin={isAdmin}
                        canEdit={isAdmin}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </BaseModal>
        </div>
    );
}
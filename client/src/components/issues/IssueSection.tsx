'use client';

import { useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import ReportIssueModal, {
    type ReportIssueFormValues,
} from '@/components/modals/ReportIssueModal';
import IssueDetailPanel from './IssueDetailPanel';
import { createIssueApi } from '@/lib/issues.api';
import type { Issue, CreateIssueInput } from '@/types/issues';

type Props = {
    householdId: string;
    isAdmin: boolean;
    initialIssues?: Issue[];
};

function formToCreateIssueInput(values: ReportIssueFormValues): CreateIssueInput {
    // TEMP until backend supports type/priority/anonymous fields
    const meta = `Type: ${values.type}\nPriority: ${values.priority}\nAnonymous: ${values.anonymous ? 'yes' : 'no'
        }`;

    return {
        title: values.title.trim(),
        description: `${values.description.trim()}\n\n---\n${meta}`,
    };
}

export default function IssuesSection({
    householdId,
    isAdmin,
    initialIssues = [],
}: Props) {
    const [issues, setIssues] = useState<Issue[]>(initialIssues);

    // Add Issue Modal
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Detail Modal
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    async function handleCreate(values: ReportIssueFormValues) {
        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const created = await createIssueApi(
                householdId,
                formToCreateIssueInput(values)
            );

            setIssues((prev) => [created, ...prev]);
            setIsReportOpen(false);

            // Optional: immediately open detail modal for new issue
            setSelectedIssue(created);
            setIsDetailOpen(true);
        } catch (e) {
            setSubmitError(
                e instanceof Error ? e.message : 'Failed to submit issue.'
            );
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
                    <div className="text-text-secondary text-sm py-2">
                        No issues yet.
                    </div>
                ) : (
                    issues.map((issue) => (
                        <div
                            key={issue.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                setSelectedIssue(issue);
                                setIsDetailOpen(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setSelectedIssue(issue);
                                    setIsDetailOpen(true);
                                }
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
                                <span>Reported by {issue.reportedBy?.name ?? 'Unknown'}</span>
                                <span>&bull;</span>
                                <span>
                                    {new Date(issue.createdAt).toLocaleString()}
                                </span>
                                <span>&bull;</span>
                                <span>
                                    {issue.comments.length} comment
                                    {issue.comments.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Report Issue Modal */}
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

            <BaseModal
                open={isDetailOpen}
                ariaLabel="Issue details"
                title="Issue Details"
                subtitle="Review full issue details"
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedIssue(null);
                }}
                maxWidthClassName="max-w-[760px]"
            >
                {selectedIssue && (
                    <IssueDetailPanel
                        issue={selectedIssue}
                        isAdmin={isAdmin}
                    />
                )}
            </BaseModal>
        </div>
    );
}
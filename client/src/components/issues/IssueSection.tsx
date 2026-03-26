'use client';

import { useEffect, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import ReportIssueModal, { type ReportIssueFormValues } from '@/components/modals/ReportIssueModal';
import IssueDetailPanel from './IssueDetailPanel';
import { useRouter } from 'next/navigation';
import IssueDeleteModal from './IssueDeleteModal';

import {
    createIssueApi,
    listIssuesApi,
    deleteIssueApi,
    updateIssueApi,
} from '@/lib/issues.api';

import type { Issue, IssueStatus } from '@/types/issues';import IssueCard from './IssueCard';

import IssueModalHeader from '@/components/issues/IssueHeaderModal';

import { issueToForm, toUpdateIssueInput } from '@/lib/issues-form';

type Props = {
    householdId: string;
    isAdmin: boolean;
    currentUserId?: string;
    initialIssues?: Issue[];
};


export default function IssuesSection({ householdId, isAdmin, currentUserId, initialIssues = [] }: Props) {
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

    const router = useRouter();

    // delete modal
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    function handleDeleteClick(issue: Issue) {
        setDeleteTarget(issue);
        setIsDeleteOpen(true);
    }

    function canEditIssue(issue: Issue | null) {
        if (!issue) return false;

        const allowed = isAdmin || issue.reportedById === currentUserId;

        return allowed;
    }

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
        const allowed = canEditIssue(issue);
        if (!allowed) return;

        setEditTarget(issue);
        setIsEditOpen(true);
        setIsDetailOpen(false);
        setSubmitError(null);
    }

    //updated for delete modal!
    //for delete modal!
    async function handleDelete(issueId: string) {
        if (!householdId) return;

        try {
            setIsDeleting(true);

            await deleteIssueApi(householdId, issueId);

            setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
            setIsDeleteOpen(false);
            setDeleteTarget(null);
            setIsDetailOpen(false);
            setSelectedIssue(null);

            if (editTarget?.id === issueId) {
                setEditTarget(null);
                setIsEditOpen(false);
            }
        } catch (err) {
            console.error('Failed to delete issue:', err);
        } finally {
            setIsDeleting(false);
        }
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

    const recentIssues = [...issues]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

    return (
        <div className="lg:col-span-2 bg-surface rounded-md p-6 shadow-sm border border-divider">
            {/* Header */}
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-divider">
                <h2 className="text-lg font-semibold">Report Issues</h2>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/households/${householdId}/issues`)}
                        className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
                    >
                        Full Reports
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsReportOpen(true);
                            setSubmitError(null);
                        }}
                        className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                    >
                        + Report Issue
                    </button>
                </div>
            </div>

            {/* Issue List */}
            <div className="flex flex-col gap-3">
                {recentIssues.map((issue) => (
                    <IssueCard
                        key={issue.id}
                        issue={issue}
                        onClick={openDetail}
                        variant="dashboard"
                    />
                ))}
            </div>

            {isReportOpen && (
                <ReportIssueModal
                    key="create-issue"
                    open={true}
                    isSubmitting={isSubmitting}
                    error={submitError}
                    onClose={() => {
                        if (isSubmitting) return;
                        setIsReportOpen(false);
                        setSubmitError(null);
                    }}
                    onSubmit={handleCreate}
                />
            )}

            {isEditOpen && editTarget && (
                <ReportIssueModal
                    key={`edit-${editTarget.id}`}
                    open={true}
                    mode="edit"
                    initialValue={issueToForm(editTarget)}
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
            )}

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
                        canEdit={canEditIssue(selectedIssue)}
                        onEdit={handleEditClick}
                        onDelete={() => {
                            if (selectedIssue) handleDeleteClick(selectedIssue);
                        }}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </BaseModal>

            <IssueDeleteModal
                open={isDeleteOpen}
                issue={deleteTarget}
                isDeleting={isDeleting}
                onClose={() => {
                    if (isDeleting) return;
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={handleDelete}
            />

        </div>
    );
}
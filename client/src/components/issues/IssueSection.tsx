'use client';

import { useEffect, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import ReportIssueModal, { type ReportIssueFormValues } from '@/components/modals/ReportIssueModal';
import IssueDetailPanel from './IssueDetailPanel';
import { useRouter } from 'next/navigation';
import IssueDeleteModal from './IssueDeleteModal';
import useDeleteFlow from '@/hook/useDeleteFlow';
import { uploadImageApi } from '@/lib/upload.api';

import {
    createIssueApi,
    listIssuesApi,
    deleteIssueApi,
    updateIssueApi,
} from '@/lib/issues.api';

import type { Issue, IssueStatus } from '@/types/issues'; import IssueCard from './IssueCard';

import IssueModalHeader from '@/components/issues/IssueHeaderModal';
import { createIssueCommentApi } from '@/lib/issues.api';

import { issueToForm, toUpdateIssueInput } from '@/lib/issues-form';
import { clear } from 'console';

type Preview = { id: string; url: string; file: File };

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

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

    //image upload state
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const router = useRouter();

    // delete modal
    //deleted handleDeleteClick to accommodate new delete flow hook
    const {
        isDeleteOpen,
        deleteTarget,
        isDeleting,
        setIsDeleting,
        openDelete,
        closeDelete,
        forceCloseDelete,
    } = useDeleteFlow<Issue>();

    const busy = isSubmitting || uploading;


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

    //photo image upload
    function validateFiles(files: File[]) {
        const ok: File[] = [];
        for (const f of files) {
            if (!f.type.startsWith('image/')) continue;
            if (f.size > 10 * 1024 * 1024) continue; // 10 MB
            ok.push(f);
        }
        return ok;
    }

    function addFiles(filesLike: FileList | File[]) {
        const files = validateFiles(Array.from(filesLike));
        if (files.length === 0) return;

        for (const p of previews) URL.revokeObjectURL(p.url);

        const file = files[0];
        const url = URL.createObjectURL(file);

        setPreviews([{ id: uid(), url, file }]);
        setUploadError(null);
    }

    function removePreview(id: string) {
        setPreviews((prev) => {
            const found = prev.find((p) => p.id === id);
            if (found) URL.revokeObjectURL(found.url);
            return prev.filter((p) => p.id !== id);
        });
    }


    function clearImageState() {
        previews.forEach((p) => URL.revokeObjectURL(p.url));
        setPreviews([]);
        setUploadError(null);
    }

    //updated for delete modal!
    //for delete modal hook flow
    async function handleDelete(issueId: string) {
        if (!householdId) return;

        try {
            setIsDeleting(true);

            await deleteIssueApi(householdId, issueId);

            setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
            forceCloseDelete();
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
            setUploadError(null);

            let photoUrl: string | null = null;

            if (previews.length > 0) {
                try {
                    setUploading(true);
                    photoUrl = await uploadImageApi(previews[0].file);
                } catch (err) {
                    setUploadError(
                        err instanceof Error ? err.message : 'Image upload failed'
                    );
                    return;
                } finally {
                    setUploading(false);
                }
            }

            const created = await createIssueApi(householdId, {
                title: values.title,
                type: values.type,
                priority: values.priority,
                description: values.description,
                anonymous: values.anonymous,
                photoUrl,
            });

            setIssues((prev) => [created, ...prev]);
            setIsReportOpen(false);
            clearImageState();
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
            setUploadError(null);

            let photoUrl: string | null = values.photoUrl ?? editTarget.photoUrl ?? null;
            if (previews.length > 0) {
                try {
                    setUploading(true);
                    photoUrl = await uploadImageApi(previews[0].file);
                } catch (err) {
                    setUploadError(
                        err instanceof Error ? err.message : 'Image upload failed'
                    );
                    return;
                } finally {
                    setUploading(false);
                }
            }

            const payload = {
                ...toUpdateIssueInput(values),
                photoUrl,
            };

            const updated = await updateIssueApi(householdId, editTarget.id, payload);

            setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setSelectedIssue(updated);

            setIsEditOpen(false);
            setEditTarget(null);
            clearImageState();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to update issue.');
        } finally {
            setIsSubmitting(false);
        }
    }


    // for comment section
    async function handleAddComment(issueId: string, content: string) {
        if (!householdId) return;

        try {
            const created = await createIssueCommentApi(householdId, issueId, {
                content,
            });

            setIssues((prev) =>
                prev.map((issue) =>
                    issue.id === issueId
                        ? { ...issue, comments: [...issue.comments, created] }
                        : issue
                )
            );

            setSelectedIssue((prev) =>
                prev && prev.id === issueId
                    ? { ...prev, comments: [...prev.comments, created] }
                    : prev
            );
        } catch (err) {
            console.error('Failed to add comment:', err);
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
                    uploading={uploading}
                    uploadError={uploadError}
                    previews={previews}
                    onAddFiles={addFiles}
                    onRemovePreview={removePreview}
                    error={submitError}
                    onClose={() => {
                        if (isSubmitting || uploading) return;
                        setIsReportOpen(false);
                        setSubmitError(null);
                        setUploadError(null);
                        clearImageState();
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
                    uploading={uploading}
                    uploadError={uploadError}
                    previews={previews}
                    onAddFiles={addFiles}
                    onRemovePreview={removePreview}
                    error={submitError}
                    onClose={() => {
                        if (isSubmitting) return;
                        setIsEditOpen(false);
                        setEditTarget(null);
                        setSubmitError(null);
                        setUploadError(null);
                        clearImageState();
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
                            if (selectedIssue) openDelete(selectedIssue);
                        }}
                        onStatusChange={handleStatusChange}
                        onAddComment={handleAddComment}
                    />
                )}
            </BaseModal>

            <IssueDeleteModal
                open={isDeleteOpen}
                issue={deleteTarget}
                isDeleting={isDeleting}
                onClose={closeDelete}
                onConfirm={handleDelete}
            />

        </div>
    );
}
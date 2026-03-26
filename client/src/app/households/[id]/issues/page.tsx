'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppNavbar from '@/components/shared/AppNavbar';
import BaseModal from '@/components/modals/BaseModal';
import IssueDeleteModal from '@/components/issues/IssueDeleteModal';
import ReportIssueModal, {
    type ReportIssueFormValues,
} from '@/components/modals/ReportIssueModal';
import IssueDetailPanel from '@/components/issues/IssueDetailPanel';
import { getHousehold } from '@/lib/households';
import { createIssueApi, deleteIssueApi, listIssuesApi, updateIssueApi } from '@/lib/issues.api';
import type { Household } from '@/types/households';
import type { Issue, IssuePriority, IssueStatus, IssueType } from '@/types/issues';
import IssueCard from '@/components/issues/IssueCard';

import IssueModalHeader from '@/components/issues/IssueHeaderModal';
import { humanizeEnum, statusBadgeClasses } from '@/lib/issues-display';
import { issueToForm, toUpdateIssueInput } from '@/lib/issues-form';
import useDeleteFlow from '@/hook/useDeleteFlow';
import { createIssueCommentApi } from '@/lib/issues.api';

export default function IssuesPage() {
    const router = useRouter();
    const params = useParams();
    const householdId = typeof params.id === 'string' ? params.id : undefined;
    const { user } = useAuth();

    const [household, setHousehold] = useState<Household | null>(null);
    const [loadingHousehold, setLoadingHousehold] = useState(true);
    const [householdError, setHouseholdError] = useState<string | null>(null);

    const [issues, setIssues] = useState<Issue[]>([]);
    const [loadingIssues, setLoadingIssues] = useState(true);
    const [issuesError, setIssuesError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [activeStatus, setActiveStatus] = useState<'ALL' | IssueStatus>('ALL');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

    //this is for the delete modal! + flow
    const {
        isDeleteOpen,
        deleteTarget,
        isDeleting,
        setIsDeleting,
        openDelete,
        closeDelete,
        forceCloseDelete,
    } = useDeleteFlow<Issue>();

    const [priorityFilters, setPriorityFilters] = useState<Record<IssuePriority, boolean>>({
        URGENT: true,
        MEDIUM: true,
        LOW: true,
    });

    const [typeFilters, setTypeFilters] = useState<Record<IssueType, boolean>>({
        MAINTENANCE: true,
        HOUSEMATE_CONFLICT: true,
        NOISE_COMPLAINT: true,
        CLEANLINESS: true,
        OTHER: true,
    });

    //for dropdown button only
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    //number of pages
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);


    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Issue | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const currentUserId = user?.id ?? null;
    const isAdmin = household?.myRole === 'ADMIN';

    const loadHouseholdData = useCallback(async () => {
        if (!householdId) {
            setHousehold(null);
            setHouseholdError('Missing household id.');
            setLoadingHousehold(false);
            return;
        }

        try {
            setLoadingHousehold(true);
            setHouseholdError(null);
            const data = await getHousehold(householdId);
            setHousehold(data);
        } catch (err) {
            console.error('Failed to load household:', err);
            setHousehold(null);
            setHouseholdError('Failed to load household.');
        } finally {
            setLoadingHousehold(false);
        }
    }, [householdId]);

    const loadIssues = useCallback(async () => {
        if (!householdId) {
            setIssues([]);
            setIssuesError('Missing household id.');
            setLoadingIssues(false);
            return;
        }

        try {
            setLoadingIssues(true);
            setIssuesError(null);
            const { issues: fresh } = await listIssuesApi(householdId);
            setIssues(fresh);

            // keep selected issue in sync if it still exists
            setSelectedIssue((prev) => {
                if (!prev) return null;
                return fresh.find((issue) => issue.id === prev.id) ?? null;
            });
        } catch (err) {
            console.error('Failed to load issues:', err);
            setIssues([]);
            setIssuesError('Failed to load issues.');
        } finally {
            setLoadingIssues(false);
        }
    }, [householdId]);


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        void loadHouseholdData();
    }, [loadHouseholdData]);

    useEffect(() => {
        void loadIssues();
    }, [loadIssues]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, activeStatus, sortBy, priorityFilters, typeFilters]);

    useEffect(() => {
        if (isDetailOpen && selectedIssue && !issues.some((issue) => issue.id === selectedIssue.id)) {
            setIsDetailOpen(false);
            setSelectedIssue(null);
        }
    }, [issues, isDetailOpen, selectedIssue]);

    function canEditIssue(issue: Issue | null) {
        if (!issue) return false;
        return Boolean(isAdmin || issue.reportedById === currentUserId);
    }

    function togglePriority(priority: IssuePriority) {
        setPriorityFilters((prev) => ({
            ...prev,
            [priority]: !prev[priority],
        }));
    }

    function toggleType(type: IssueType) {
        setTypeFilters((prev) => ({
            ...prev,
            [type]: !prev[type],
        }));
    }

    function openDetail(issue: Issue) {
        setSelectedIssue(issue);
        setIsDetailOpen(true);
        setSubmitError(null);
    }

    function handleOpenCreate() {
        setIsDetailOpen(false);
        setSelectedIssue(null);
        setIsEditOpen(false);
        setEditTarget(null);
        setSubmitError(null);
        setIsReportOpen(true);
    }

    function handleEditClick(issue: Issue) {
        if (!canEditIssue(issue)) return;

        setSelectedIssue(issue);
        setEditTarget(issue);
        setIsDetailOpen(false);
        setIsEditOpen(true);
        setSubmitError(null);
    }

    async function handleStatusChange(issueId: string, status: IssueStatus) {
        if (!householdId) return;

        try {
            const updated = await updateIssueApi(householdId, issueId, { status });
            setIssues((prev) => prev.map((issue) => (issue.id === updated.id ? updated : issue)));
            setSelectedIssue(updated);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    }

    //updated for delete modal!
    //for delete modal! + flow
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
        if (!householdId) return;

        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const created = await createIssueApi(householdId, {
                title: values.title.trim(),
                type: values.type,
                priority: values.priority,
                description: values.description?.trim() || '',
                anonymous: values.anonymous,
            });

            setIssues((prev) => [created, ...prev]);
            setIsReportOpen(false);
            setSubmitError(null);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to create issue.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleEditSubmit(values: ReportIssueFormValues) {
        if (!householdId || !editTarget) return;

        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const updated = await updateIssueApi(householdId, editTarget.id, toUpdateIssueInput(values));

            setIssues((prev) => prev.map((issue) => (issue.id === updated.id ? updated : issue)));
            setSelectedIssue(updated);
            setEditTarget(updated);
            setIsEditOpen(false);
            setSubmitError(null);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Failed to update issue.');
        } finally {
            setIsSubmitting(false);
        }
    }

    // for comments
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


    const issuesForStatusCounts = useMemo(() => {
        const q = search.trim().toLowerCase();

        return issues.filter((issue) => {
            const reporterName = issue.isAnonymous
                ? 'anonymous'
                : issue.reportedBy?.name?.toLowerCase() ?? 'unknown';

            const matchesPriority = priorityFilters[issue.priority];
            const matchesType = typeFilters[issue.type];
            const typeText = humanizeEnum(issue.type).toLowerCase();

            const matchesSearch =
                q.length === 0 ||
                issue.title.toLowerCase().includes(q) ||
                reporterName.includes(q) ||
                issue.id.toLowerCase().includes(q) ||
                typeText.includes(q) ||
                (issue.description?.toLowerCase().includes(q) ?? false);

            return matchesPriority && matchesType && matchesSearch;
        });
    }, [issues, search, priorityFilters, typeFilters]);

    const filteredIssues = useMemo(() => {
        const filtered = issuesForStatusCounts.filter((issue) => {
            return activeStatus === 'ALL' || issue.status === activeStatus;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }

            if (sortBy === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }

            const rank: Record<IssuePriority, number> = {
                URGENT: 0,
                MEDIUM: 1,
                LOW: 2,
            };

            return rank[a.priority] - rank[b.priority];
        });
    }, [issuesForStatusCounts, activeStatus, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredIssues.length / ITEMS_PER_PAGE));

    const paginatedIssues = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredIssues.slice(start, end);
    }, [filteredIssues, currentPage]);

    const statusCounts = useMemo(() => {
        return {
            ALL: issuesForStatusCounts.length,
            OPEN: issuesForStatusCounts.filter((issue) => issue.status === 'OPEN').length,
            IN_PROGRESS: issuesForStatusCounts.filter((issue) => issue.status === 'IN_PROGRESS').length,
            RESOLVED: issuesForStatusCounts.filter((issue) => issue.status === 'RESOLVED').length,
            ARCHIVED: issuesForStatusCounts.filter((issue) => issue.status === 'ARCHIVED').length,
        };
    }, [issuesForStatusCounts]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);


    if (loadingHousehold) {
        return (
            <div className="min-h-screen bg-base">
                <AppNavbar />
                <div className="max-w-[1100px] mx-auto px-6 py-8 text-text-secondary">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base">
            <AppNavbar />

            <div className="max-w-[1100px] mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary">Full Reports</h1>
                        <div className="text-sm text-text-secondary">
                            {household?.name ?? 'Household Reports'}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                        >
                            + Report Issue
                        </button>

                        <button
                            className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
                            type="button"
                            onClick={() => router.push(`/households/${householdId}`)}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {householdError && (
                    <div className="mb-4 rounded-md border border-urgent bg-urgent/5 px-4 py-3 text-sm text-urgent">
                        {householdError}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <aside className="h-fit rounded-md border border-divider bg-surface p-5 shadow-sm">
                        <div>
                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                Status
                            </div>

                            <div className="space-y-1">
                                {[
                                    { key: 'ALL', label: 'All Issues', count: statusCounts.ALL },
                                    { key: 'OPEN', label: 'Open', count: statusCounts.OPEN },
                                    {
                                        key: 'IN_PROGRESS',
                                        label: 'In Progress',
                                        count: statusCounts.IN_PROGRESS,
                                    },
                                    {
                                        key: 'RESOLVED',
                                        label: 'Resolved',
                                        count: statusCounts.RESOLVED,
                                    },
                                    {
                                        key: 'ARCHIVED',
                                        label: 'Archived',
                                        count: statusCounts.ARCHIVED,
                                    },
                                ].map((option) => {
                                    const active = activeStatus === option.key;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => setActiveStatus(option.key as 'ALL' | IssueStatus)}
                                            className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition ${active
                                                ? 'bg-soft-highlight text-text-primary'
                                                : 'text-text-secondary hover:bg-base'
                                                }`}
                                        >
                                            <span>{option.label}</span>
                                            <span className="text-xs">{option.count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="my-5 border-t border-divider" />

                        <div>
                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                Priority
                            </div>

                            <div className="space-y-2">
                                {(['URGENT', 'MEDIUM', 'LOW'] as IssuePriority[]).map((priority) => (
                                    <label
                                        key={priority}
                                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-text-primary hover:bg-base"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={priorityFilters[priority]}
                                            onChange={() => togglePriority(priority)}
                                            className="h-4 w-4 accent-[var(--color-sage)]"
                                        />
                                        <span>{humanizeEnum(priority)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="my-5 border-t border-divider" />

                        <div>
                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                Type
                            </div>

                            <div className="space-y-2">
                                {(
                                    [
                                        'MAINTENANCE',
                                        'HOUSEMATE_CONFLICT',
                                        'NOISE_COMPLAINT',
                                        'CLEANLINESS',
                                        'OTHER',
                                    ] as IssueType[]
                                ).map((type) => (
                                    <label
                                        key={type}
                                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-text-primary hover:bg-base"                                    >
                                        <input
                                            type="checkbox"
                                            checked={typeFilters[type]}
                                            onChange={() => toggleType(type)}
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-sage)]"
                                        />
                                        <span>{humanizeEnum(type)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <section className="min-w-0">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="6" cy="6" r="4.5" />
                                    <path d="M10 10l2.5 2.5" />
                                </svg>

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search issues, submitters..."
                                    className="w-full rounded-sm border border-divider bg-surface py-2.5 pl-10 pr-3 text-sm text-text-primary outline-none transition focus:border-sage"
                                />
                            </div>

                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    setSortBy(e.target.value as 'newest' | 'oldest' | 'priority')
                                }
                                className="h-11 rounded-sm border border-divider bg-surface px-3 py-2.5 text-sm text-text-primary outline-none"
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="priority">By priority</option>
                            </select>
                        </div>

                        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                            <span>
                                Showing{' '}
                                <span className="font-semibold text-text-primary">
                                    {filteredIssues.length}
                                </span>{' '}
                                issues
                            </span>

                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                    'OPEN'
                                )}`}
                            >
                                {statusCounts.OPEN} open
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                    'IN_PROGRESS'
                                )}`}
                            >
                                {statusCounts.IN_PROGRESS} in progress
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                    'RESOLVED'
                                )}`}
                            >
                                {statusCounts.RESOLVED} resolved
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                    'ARCHIVED'
                                )}`}
                            >
                                {statusCounts.ARCHIVED} archived
                            </span>
                        </div>

                        {issuesError && (
                            <div className="mb-4 rounded-md border border-urgent bg-urgent/5 px-4 py-3 text-sm text-urgent">
                                <div className="flex items-center justify-between gap-3">
                                    <span>{issuesError}</span>
                                    <button
                                        type="button"
                                        onClick={() => void loadIssues()}
                                        className="rounded-sm border border-urgent px-3 py-1.5 text-xs font-medium"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            {paginatedIssues.map((issue) => (
                                <IssueCard
                                    key={issue.id}
                                    issue={issue}
                                    onClick={openDetail}
                                    variant="full"
                                />
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-text-secondary">
                                {filteredIssues.length === 0
                                    ? 'No issues'
                                    : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1
                                    }–${Math.min(currentPage * ITEMS_PER_PAGE, filteredIssues.length)} of ${filteredIssues.length
                                    } issues`}
                            </div>

                            {filteredIssues.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-sm border border-divider bg-surface px-3 py-2 text-sm text-text-primary transition hover:border-sage disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Previous
                                    </button>

                                    <div className="text-sm text-text-secondary">
                                        Page <span className="font-medium text-text-primary">{currentPage}</span> of{' '}
                                        <span className="font-medium text-text-primary">{totalPages}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-sm border border-divider bg-surface px-3 py-2 text-sm text-text-primary transition hover:border-sage disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
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

            <BaseModal
                open={isDetailOpen && Boolean(selectedIssue)}
                ariaLabel={selectedIssue ? `Issue details: ${selectedIssue.title}` : 'Issue details'}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedIssue(null);
                }}
                maxWidthClassName="max-w-[760px]"
            >
                {selectedIssue && (
                    <>
                        <div className="mb-6 pb-6 border-b-4 border-sage">
                            <IssueModalHeader issue={selectedIssue} />
                        </div>

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
                    </>
                )}
            </BaseModal>

            <IssueDeleteModal
                open={isDeleteOpen}
                issue={deleteTarget}
                isDeleting={isDeleting}
                onClose={() => {
                    if (isDeleting) return;
                    forceCloseDelete();
                }}
                onConfirm={handleDelete}
            />

        </div>
    );
}
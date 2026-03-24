'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Issue, IssueStatus } from '@/types/issues';

interface IssueDetailPanelProps {
  issue: Issue;
  isAdmin: boolean;
  canEdit: boolean;
  onStatusChange?: (issueId: string, status: IssueStatus) => void | Promise<void>;
  onAddComment?: (issueId: string, content: string) => void | Promise<void>;
  onDelete?: (issueId: string) => void | Promise<void>;
  onEdit?: (issue: Issue) => void;
}

function initials(name?: string | null) {
  const n = (name ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
}

function statusBadgeClasses(status: IssueStatus) {
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-sm font-medium text-sage mb-2 flex items-center gap-2">
      <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
      {title}
    </div>
  );
}

export default function IssueDetailPanel({
  issue,
  isAdmin,
  canEdit,
  onStatusChange,
  onAddComment,
  onDelete,
  onEdit,
}: IssueDetailPanelProps) {
  const [draft, setDraft] = useState('');
  const [localStatus, setLocalStatus] = useState<IssueStatus>(issue.status);

  useEffect(() => {
    setLocalStatus(issue.status);
  }, [issue.id, issue.status]);

  const commentsSorted = useMemo(() => {
    return [...(issue.comments ?? [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [issue.comments]);

console.log('IssueDetailPanel props', {
  isAdmin,
  canEdit,
  issueId: issue.id,
  reportedById: issue.reportedById,
});

  return (
    <div className="flex flex-col gap-4">
      {/* Description card */}
      <div className="bg-base rounded-md border border-divider p-4">
        <SectionHeader title="Description" />
        {issue.description ? (
          <p className="text-text-primary whitespace-pre-wrap">{issue.description}</p>
        ) : (
          <p className="text-text-secondary text-sm">No description provided.</p>
        )}
      </div>

      {/* Comments card */}
      <div className="bg-base rounded-md border border-divider p-4">
        <SectionHeader title={`Comments (${commentsSorted.length})`} />

        {commentsSorted.length === 0 ? (
          <div className="p-4 text-center rounded-md border border-divider border-dashed text-text-secondary text-sm">
            No comments yet. Be the first to leave a note.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {commentsSorted.map((c) => (
              <div key={c.id} className="bg-surface rounded-md border border-divider p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sage text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials(c.user?.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">
                      {c.user?.name ?? 'Unknown'}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-sm text-text-primary whitespace-pre-wrap">
                  {c.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <div className="mt-4">
          <label className="text-sm font-medium text-sage block mb-2">Add a comment</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-sm border border-divider bg-surface px-3 py-2 min-h-[90px] resize-y"
            placeholder="Write a comment..."
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={async () => {
                const text = draft.trim();
                if (!text) return;
                await onAddComment?.(issue.id, text);
                setDraft('');
              }}
              className="px-4 py-2 rounded-sm bg-sage text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-sage-hover"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      {/* Admin status + actions */}
      {canEdit && (
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <div className="bg-base rounded-md border border-divider p-4">
              <SectionHeader title="Status" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  className="w-full sm:w-[280px] rounded-sm border border-divider bg-surface px-3 py-2"
                  value={localStatus}
                  onChange={async (e) => {
                    const prev = localStatus;
                    const next = e.target.value as IssueStatus;

                    setLocalStatus(next); 
                    try {
                      await onStatusChange?.(issue.id, next);
                    } catch {
                      setLocalStatus(prev); 
                    }
                  }}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ARCHIVED">Archived</option>
                </select>

                <span
                  className={`w-fit px-2 py-1 rounded text-[11px] font-semibold uppercase border ${statusBadgeClasses(
                    localStatus
                  )}`}
                >
                  {localStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <p className="mt-2 text-xs text-text-secondary">
                Status changes are visible to the whole household.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {canEdit && (
              <button
                type="button"
                className="px-4 py-2 rounded-sm border border-divider bg-base font-medium hover:bg-surface"
                onClick={() => onEdit?.(issue)}
              >
                Edit
              </button>
            )}

            { isAdmin && (
              <button
                type="button"
                className="px-4 py-2 rounded-sm bg-urgent text-white font-medium hover:opacity-95"
                onClick={() => onDelete?.(issue.id)}
              >
                Delete Issue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import type { Issue } from '@/types/issues';

// TODO: Implement IssueDetailPanel component
// - Show full issue details: title, description, photo, status, reporter avatar + name
// - List all comments chronologically with user avatars
// - Include a comment input form at the bottom (content + optional photo)
// - Admin should see a status dropdown to change status (OPEN -> IN_PROGRESS -> RESOLVED -> ARCHIVED)
// - Use createIssueCommentApi to post new comments
// - Use updateIssueApi to change status

interface IssueDetailPanelProps {
  issue: Issue;
  isAdmin: boolean;
  onStatusChange?: (issueId: string, status: string) => void;
  onAddComment?: (issueId: string, content: string) => void;
  onClose?: () => void;
}

export default function IssueDetailPanel({
  issue,
  isAdmin,
  onStatusChange,
  onAddComment,
  onClose,
}: IssueDetailPanelProps) {
  return (
    <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
      {/* TODO: Implement full detail panel */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">{issue.title}</h2>
        <span className="text-xs uppercase font-semibold">{issue.status}</span>
      </div>

      {issue.description && (
        <p className="text-text-secondary mb-4">{issue.description}</p>
      )}

      <div className="border-t border-divider pt-4 mt-4">
        <h3 className="font-semibold mb-2">
          Comments ({issue.comments.length})
        </h3>
        {/* TODO: Render comments list */}
        {/* TODO: Add comment input form */}
      </div>
    </div>
  );
}

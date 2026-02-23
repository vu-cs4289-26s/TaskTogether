'use client';

import type { Issue } from '@/types/issues';

// TODO: Implement IssueCard component
// - Display issue title, status badge, reporter name/avatar, timestamp
// - Show comment count (issue.comments.length)
// - Status badge colors:
//     OPEN:        bg-urgent/10 text-urgent border-urgent
//     IN_PROGRESS: bg-pending/10 text-pending border-pending
//     RESOLVED:    bg-success/10 text-success border-success
//     ARCHIVED:    bg-base text-text-secondary border-divider
// - Follow the card style from households/[id]/page.tsx (border, hover, shadow)

interface IssueCardProps {
  issue: Issue;
  onClick?: (issueId: string) => void;
}

export default function IssueCard({ issue, onClick }: IssueCardProps) {
  return (
    <div
      onClick={() => onClick?.(issue.id)}
      className="p-4 rounded-sm border border-divider cursor-pointer transition-all hover:border-sage hover:shadow-sm"
    >
      {/* TODO: Implement full card layout */}
      <div className="flex justify-between items-start">
        <span className="font-semibold">{issue.title}</span>
        <span className="text-xs uppercase">{issue.status}</span>
      </div>
      <div className="text-sm text-text-secondary mt-1">
        {issue.comments.length} comment{issue.comments.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

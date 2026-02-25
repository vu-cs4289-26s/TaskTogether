'use client';

import type { Activity } from '@/types/activities';

interface ActivityCardProps {
  activity: Activity;
  currentUserId?: string;
  onJoin?: (activityId: string) => void;
  onLeave?: (activityId: string) => void;
  onClick?: (activityId: string) => void;
}

function extractTag(desc: string | null | undefined, key: string): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, 'i');
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractSubtype(activity: Activity): string | null {
  return extractTag(activity.description, 'TT_TYPE')?.toLowerCase() ?? null;
}

function prettySubtypeLabel(subtype: string | null): string {
  if (!subtype) return 'OTHER';

  switch (subtype) {
    case 'meeting':
      return 'MEETING';
    case 'shared-space':
      return 'SHARED SPACE';
    case 'social':
      return 'SOCIAL';
    case 'maintenance':
      return 'MAINTENANCE';
    case 'other':
      return 'OTHER';
    case 'personal':
      return 'PERSONAL';
    case 'household':
      return 'HOUSEHOLD';
    default:
      return subtype.toUpperCase();
  }
}

export default function ActivityCard({
  activity,
  currentUserId,
  onJoin,
  onLeave,
  onClick,
}: ActivityCardProps) {
  const isParticipant = activity.participants.some((p) => p.userId === currentUserId);

  const subtype = extractSubtype(activity);
  const typeLabel = prettySubtypeLabel(subtype);

  return (
    <div
      onClick={() => onClick?.(activity.id)}
      className="p-4 rounded-sm border border-divider cursor-pointer transition-all hover:border-sage hover:shadow-sm"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.(activity.id);
      }}
    >
      <div className="flex justify-between items-start">
        <span className="font-semibold">{activity.title}</span>
        {/* ✅ Show real event subtype label instead of ActivityType */}
        <span className="text-xs uppercase text-text-secondary">{typeLabel}</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-text-secondary mt-1 flex-wrap">
        <span>{activity.status}</span>
        <span>&bull;</span>
        <span>
          {activity.participants.length} participant{activity.participants.length !== 1 ? 's' : ''}
        </span>

        {/* Optional join/leave hooks (not wired yet) */}
        {onJoin && onLeave && currentUserId && (
          <>
            <span>&bull;</span>
            {isParticipant ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave(activity.id);
                }}
                className="text-xs underline hover:text-sage"
              >
                Leave
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(activity.id);
                }}
                className="text-xs underline hover:text-sage"
              >
                Join
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
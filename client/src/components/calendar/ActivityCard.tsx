'use client';

import type { Activity } from '@/types/activities';

// TODO: Implement ActivityCard component

interface ActivityCardProps {
  activity: Activity;
  currentUserId?: string;
  onJoin?: (activityId: string) => void;
  onLeave?: (activityId: string) => void;
  onClick?: (activityId: string) => void;
}

export default function ActivityCard({
  activity,
  currentUserId,
  onJoin,
  onLeave,
  onClick,
}: ActivityCardProps) {
  const isParticipant = activity.participants.some((p) => p.userId === currentUserId);

  return (
    <div
      onClick={() => onClick?.(activity.id)}
      className="p-4 rounded-sm border border-divider cursor-pointer transition-all hover:border-sage hover:shadow-sm"
    >
      {/* TODO: Implement full card layout */}
      <div className="flex justify-between items-start">
        <span className="font-semibold">{activity.title}</span>
        <span className="text-xs uppercase">{activity.activityType}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
        <span>{activity.status}</span>
        <span>&bull;</span>
        <span>{activity.participants.length} participant{activity.participants.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

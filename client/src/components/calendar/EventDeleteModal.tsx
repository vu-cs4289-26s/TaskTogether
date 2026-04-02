'use client';

import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';
import type { Activity } from '@/types/activities';

const typeLabels: Record<string, string> = {
  HOMEWORK: 'Homework',
  BONDING: 'Bonding',
  CHORE: 'Chore',
  OTHER: 'Other',
};

type Props = {
  open: boolean;
  activity: Activity | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: (activityId: string) => void | Promise<void>;
};

export default function EventDeleteModal({
  open,
  activity,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <DeleteConfirmModal
      open={open}
      itemLabel="event"
      warningMessage="Are you sure you want to permanently delete this event? All participants and check-ins will be removed."
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={() => {
        if (activity) return onConfirm(activity.id);
      }}
      preview={
        activity && (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-text-primary break-words">
                {activity.title}
              </h3>
              <span className="inline-flex items-center rounded-full border border-divider bg-base px-2.5 py-1 text-xs font-semibold text-text-primary">
                {typeLabels[activity.activityType] ?? activity.activityType}
              </span>
            </div>
            <div className="mt-2 text-sm text-text-secondary">
              {new Date(activity.scheduledAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
            {activity.description && (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {activity.description}
              </p>
            )}
          </div>
        )
      }
    />
  );
}

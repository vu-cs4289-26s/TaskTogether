'use client';

import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { formatDueDate, priorityStyles, priorityLabels } from '@/lib/task-helpers';
import type { Task } from '@/types/tasks';

type Props = {
  task: Task | null;            // null = closed
  currentUserId?: string;
  subtitle?: string;            // caller can customize
  onClose: () => void;
};

export default function TaskCompletionDetailsModal({
  task,
  currentUserId,
  subtitle,
  onClose,
}: Props) {
  // Build default subtitle from completion data when caller doesn't provide one
  const defaultSubtitle = task
    ? task.completions[0]?.completedAt
      ? `Completed ${new Date(task.completions[0].completedAt).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })}`
      : 'Completed'
    : undefined;

  return (
    <BaseModal
      open={!!task}
      ariaLabel="Completed task details"
      title={task?.title ?? 'Task Details'}
      subtitle={subtitle ?? defaultSubtitle}
      onClose={onClose}
      maxWidthClassName="max-w-[520px]"
    >
      {task && (
        <div className="flex flex-col gap-4">
          {/* Description */}
          {task.description && (
            <div>
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                Description
              </div>
              <div className="text-sm text-text-primary whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
              priorityStyles[task.priority || 'medium']
            }`}>
              {priorityLabels[task.priority || 'medium']}
            </span>
            {task.dueDate && (
              <span className="text-text-secondary">Due: {formatDueDate(task.dueDate)}</span>
            )}
            {task.isRecurring && task.recurrencePattern && (
              <span className="text-text-secondary capitalize">{task.recurrencePattern}</span>
            )}
          </div>

          {/* Completions */}
          {task.completions.length > 0 && (
            <div className="border-t border-divider pt-4">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Completion Details
              </div>
              {task.completions.map((c) => (
                <div key={c.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Avatar
                src={c.user?.avatar}
                name={c.user?.name || '?'}
                userKey={c.user?.id ?? c.userId}
                size="xs"
              />
              {c.user && (
                <span className="font-medium text-text-primary">
                  {c.user.id === currentUserId ? 'You' : c.user.name}
                </span>
              )}
                    <span>&bull;</span>
                    <span>
                      {new Date(c.completedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {c.notes && (
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-1">Notes</div>
                      <div className="text-sm text-text-primary bg-base rounded-sm p-3 whitespace-pre-wrap">
                        {c.notes}
                      </div>
                    </div>
                  )}
                  {c.photoUrl && (
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-1">Photo</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.photoUrl}
                        alt="Completion photo"
                        className="rounded-sm border border-divider max-h-[300px] object-contain w-full bg-base"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}

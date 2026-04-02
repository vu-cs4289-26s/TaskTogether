'use client';

import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';
import type { Task } from '@/types/tasks';

const priorityClasses: Record<string, string> = {
  high: 'border-urgent bg-urgent/10 text-urgent',
  medium: 'border-pending bg-pending/10 text-pending',
  low: 'border-success bg-success/10 text-success',
};

type Props = {
  open: boolean;
  task: Task | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: (taskId: string) => void | Promise<void>;
};

export default function TaskDeleteModal({
  open,
  task,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <DeleteConfirmModal
      open={open}
      itemLabel="task"
      warningMessage="Are you sure you want to permanently delete this task? All assignments and completion history will be removed."
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={() => {
        if (task) return onConfirm(task.id);
      }}
      preview={
        task && (
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-text-primary break-words">
              {task.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {task.priority && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClasses[task.priority] ?? ''}`}
                >
                  {task.priority}
                </span>
              )}
              {task.dueDate && (
                <>
                  <span className="opacity-60">•</span>
                  <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
            {task.description && (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {task.description}
              </p>
            )}
          </div>
        )
      }
    />
  );
}

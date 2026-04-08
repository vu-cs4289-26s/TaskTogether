'use client';

import { useEffect, useRef, useState } from 'react';
import type { HouseholdMember } from '@/types/households';
import type { CreateTaskInput, UpdateTaskInput, Task, TaskPriority, RecurrencePattern } from '@/types/tasks';
import TaskDeleteModal from '@/components/tasks/TaskDeleteModal';
import useDeleteFlow from '@/hooks/useDeleteFlow';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  members: HouseholdMember[];
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void | Promise<void>;
  /** If provided, modal opens in edit mode */
  editingTask?: Task | null;
  onUpdate?: (input: UpdateTaskInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

function toDateInputValue(isoStr: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toISOString().split('T')[0];
}

export default function AddTaskModal({
  open,
  isSubmitting,
  error,
  members,
  onClose,
  onCreate,
  editingTask,
  onUpdate,
  onDelete,
}: Props) {
  const isEditMode = !!editingTask;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [isRotating, setIsRotating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Delete flow
  const {
    isDeleteOpen,
    deleteTarget,
    isDeleting,
    setIsDeleting,
    openDelete,
    closeDelete,
    forceCloseDelete,
  } = useDeleteFlow<Task>();

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setAssignedToUserId('');
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setIsRotating(false);
      setLocalError(null);
      return;
    }

    // Populate form with editing task values
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setDueDate(toDateInputValue(editingTask.dueDate));
      setPriority(editingTask.priority || 'medium');
      setAssignedToUserId(editingTask.assignments[0]?.userId || '');
      setIsRecurring(editingTask.isRecurring);
      setRecurrencePattern((editingTask.recurrencePattern as RecurrencePattern) || 'weekly');
      setIsRotating(editingTask.isRotating);
    }

    queueMicrotask(() => titleInputRef.current?.focus());
  }, [open, editingTask]);

  if (!open) return null;

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError('Task title is required.');
      return;
    }
    setLocalError(null);

    if (isEditMode && onUpdate) {
      const input: UpdateTaskInput = {
        title: trimmed,
        priority,
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : undefined,
        isRotating: isRecurring ? isRotating : false,
      };
      await onUpdate(input);
    } else {
      const input: CreateTaskInput = {
        title: trimmed,
        priority,
      };
      if (description.trim()) input.description = description.trim();
      if (dueDate) input.dueDate = new Date(dueDate).toISOString();
      if (assignedToUserId) input.assignedToUserId = assignedToUserId;
      if (isRecurring) {
        input.isRecurring = true;
        input.recurrencePattern = recurrencePattern;
        if (isRotating) input.isRotating = true;
      }
      await onCreate(input);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit task' : 'Create new task'}
    >
      <div className="w-full max-w-[560px] bg-surface rounded-md shadow-lg border border-divider p-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 pb-6 border-b-4 border-sage">
          <h2 className="text-2xl font-heading font-semibold text-sage">
            {isEditMode ? 'Edit Chore' : 'Add New Chore'}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {isEditMode ? 'Update the task details' : 'Create a task for your household'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="task-title"
              className="text-sm font-medium text-sage flex items-center gap-2"
            >
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Title <span className="text-red-600">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              placeholder="e.g., Vacuum living room"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="task-description"
              className="text-sm font-medium text-sage flex items-center gap-2"
            >
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Description
            </label>
            <textarea
              id="task-description"
              placeholder="Add details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px] px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition resize-y focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
            />
          </div>

          {/* Due Date + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-due-date"
                className="text-sm font-medium text-sage flex items-center gap-2"
              >
                <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-priority"
                className="text-sm font-medium text-sage flex items-center gap-2"
              >
                <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
              >
                <option value="high">P1 - High</option>
                <option value="medium">P2 - Medium</option>
                <option value="low">P3 - Low</option>
              </select>
            </div>
          </div>

          {/* Assign To (only in create mode) */}
          {!isEditMode && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-assignee"
                className="text-sm font-medium text-sage flex items-center gap-2"
              >
                <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
                Assign To
              </label>
              <select
                id="task-assignee"
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recurring */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (!e.target.checked) setIsRotating(false);
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4 accent-sage"
                />
                <span className="text-sm font-medium text-text-primary">Recurring task</span>
              </label>

              {isRecurring && (
                <select
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-sm border border-divider bg-surface text-text-primary text-sm transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>

            {isRecurring && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={isRotating}
                  onChange={(e) => setIsRotating(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 accent-sage"
                />
                <span className="text-sm text-text-primary">Rotate assignment among members</span>
                <span className="text-xs text-text-secondary">(round-robin)</span>
              </label>
            )}
          </div>

          {(localError || error) && (
            <div className="mt-1 text-sm text-red-600">
              {localError ?? error}
            </div>
          )}

      {/* Delete confirmation modal */}
      <TaskDeleteModal
        open={isDeleteOpen}
        task={deleteTarget}
        isDeleting={isDeleting}
        onClose={closeDelete}
        onConfirm={async () => {
          if (!onDelete) return;
          try {
            setIsDeleting(true);
            await onDelete();
            forceCloseDelete();
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      <div className="flex gap-4 justify-end mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || !title.trim()}
          className="px-6 py-3 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting
            ? isEditMode ? 'Saving...' : 'Creating...'
            : isEditMode ? 'Save Changes' : 'Create Task'}
        </button>

        {/* Delete button (edit mode only) - moved to right side */}
        {isEditMode && onDelete && (
          <button
            type="button"
            onClick={() => editingTask && openDelete(editingTask)}
            disabled={isSubmitting}
            className="px-4 py-3 rounded-sm border border-urgent text-urgent font-medium transition hover:bg-urgent/10 disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

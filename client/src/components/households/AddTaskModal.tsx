'use client';

import { useEffect, useRef, useState } from 'react';
import type { HouseholdMember } from '@/types/households';
import type { CreateTaskInput, TaskPriority, RecurrencePattern } from '@/types/tasks';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  members: HouseholdMember[];
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void | Promise<void>;
};

export default function AddTaskModal({
  open,
  isSubmitting,
  error,
  members,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [localError, setLocalError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setAssignedToUserId('');
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setLocalError(null);
      return;
    }
    queueMicrotask(() => titleInputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError('Task title is required.');
      return;
    }
    setLocalError(null);

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
    }

    await onCreate(input);
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
      aria-label="Create new task"
    >
      <div className="w-full max-w-[560px] bg-surface rounded-md shadow-lg border border-divider p-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 pb-6 border-b-4 border-sage">
          <h2 className="text-2xl font-heading font-semibold text-sage">
            Add New Chore
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create a task for your household
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
              Description (Optional)
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

          {/* Assign To */}
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

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
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

          {(localError || error) && (
            <div className="mt-1 text-sm text-red-600">
              {localError ?? error}
            </div>
          )}

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
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

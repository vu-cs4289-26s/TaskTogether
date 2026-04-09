'use client';

import { useEffect, useRef, useState } from 'react';
import BaseModal from './BaseModal';
import Button from '@/components/ui/Button';
import PriorityPill from '@/components/ui/PriorityPill';
import type { TaskPriority } from '@/types/tasks';

type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type TaskFormData = {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  recurrence: RecurrencePattern;
  isRotating: boolean;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  error: string | null;
  members: Array<{ id: string; name: string }>;
  isAdmin?: boolean;
  currentUserId?: string;
  initialValue?: Partial<TaskFormData>;
  onClose: () => void;
  onSave: (data: TaskFormData) => void | Promise<void>;
  onRequestDelete?: () => void;
};

export default function TaskModal({
  open,
  mode,
  isSubmitting,
  error,
  members,
  isAdmin = false,
  currentUserId,
  initialValue,
  onClose,
  onSave,
  onRequestDelete,
}: Props) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    dueDate: '',
    recurrence: 'none',
    isRotating: false,
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // Track initial values for unsaved changes detection
  const [initialFormState, setInitialFormState] = useState<string>('');

  // Reset and populate form when modal opens
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assigneeId: '',
        dueDate: '',
        recurrence: 'none',
        isRotating: false,
      });
      setInitialFormState('');
      setLocalError(null);
      setHasUnsavedChanges(false);
      setShowUnsavedConfirm(false);
      return;
    }

    // Populate with initial values for edit mode
    const newFormData: TaskFormData = {
      title: initialValue?.title ?? '',
      description: initialValue?.description ?? '',
      priority: initialValue?.priority ?? 'medium',
      assigneeId: initialValue?.assigneeId ?? '',
      dueDate: initialValue?.dueDate ?? '',
      recurrence: initialValue?.recurrence ?? 'none',
      isRotating: initialValue?.isRotating ?? false,
    };
    setFormData(newFormData);
    setInitialFormState(JSON.stringify(newFormData));
    setHasUnsavedChanges(false);

    // Auto-focus title input
    queueMicrotask(() => titleInputRef.current?.focus());
  }, [open, initialValue]);

  // Track changes
  useEffect(() => {
    if (open && initialFormState) {
      const currentState = JSON.stringify(formData);
      setHasUnsavedChanges(currentState !== initialFormState);
    }
  }, [formData, open, initialFormState]);

  function validate(): boolean {
    if (!formData.title.trim()) {
      setLocalError('Task title is required');
      return false;
    }
    if (!formData.assigneeId) {
      setLocalError('Assignee is required');
      return false;
    }
    setLocalError(null);
    return true;
  }

  async function handleSubmit() {
    if (!validate() || isSubmitting) return;
    await onSave(formData);
  }

  function handleClose() {
    if (hasUnsavedChanges && !isSubmitting) {
      setShowUnsavedConfirm(true);
      return;
    }
    onClose();
  }

  function confirmClose() {
    setShowUnsavedConfirm(false);
    onClose();
  }

  const displayError = localError || error;

  return (
    <BaseModal
      open={open && !showUnsavedConfirm}
      ariaLabel={mode === 'create' ? 'Create new task' : 'Edit task'}
      title={mode === 'create' ? 'Create Task' : 'Edit Task'}
      subtitle={mode === 'create' ? 'Create a task for your household' : 'Update the task details'}
      isBlocking={isSubmitting}
      maxWidthClassName="max-w-[560px]"
      onClose={handleClose}
    >
      <div className="flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-sage flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
            Title <span className="text-urgent">*</span>
          </label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="e.g., Vacuum living room"
            value={formData.title}
            onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
            disabled={isSubmitting}
            className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-sage flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
            Description
          </label>
          <textarea
            placeholder="Add details about this task..."
            value={formData.description}
            onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
            disabled={isSubmitting}
            rows={3}
            className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition resize-y focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
          />
        </div>

        {/* Due Date & Priority row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sage flex items-center gap-2">
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData((d) => ({ ...d, dueDate: e.target.value }))}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-sm font-medium text-sage flex items-center gap-2">
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Priority <span className="text-urgent">*</span>
            </div>

            <div className="flex gap-2">
              <PriorityPill
                label="High"
                selected={formData.priority === 'high'}
                tone="high"
                onClick={() => setFormData((d) => ({ ...d, priority: 'high' }))}
                disabled={isSubmitting}
              />
              <PriorityPill
                label="Medium"
                selected={formData.priority === 'medium'}
                tone="medium"
                onClick={() => setFormData((d) => ({ ...d, priority: 'medium' }))}
                disabled={isSubmitting}
              />
              <PriorityPill
                label="Low"
                selected={formData.priority === 'low'}
                tone="low"
                onClick={() => setFormData((d) => ({ ...d, priority: 'low' }))}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-sage flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
            Assign To <span className="text-urgent">*</span>
          </label>
          {!isAdmin && (
            <p className="text-xs text-text-secondary">
              Only admins can assign tasks to other members
            </p>
          )}
          <select
            value={formData.assigneeId}
            onChange={(e) => setFormData((d) => ({ ...d, assigneeId: e.target.value }))}
            disabled={isSubmitting}
            className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60"
          >
            <option value="">Select assignee...</option>
            {isAdmin ? (
              members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            ) : currentUserId ? (
              members
                .filter((m) => m.id === currentUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    Me
                  </option>
                ))
            ) : null}
          </select>
        </div>

        {/* Recurring */}
        <div className="flex flex-col gap-3 p-4 rounded-sm border border-divider bg-base">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.recurrence !== 'none'}
                onChange={(e) =>
                  setFormData((d) => ({
                    ...d,
                    recurrence: e.target.checked ? 'weekly' : 'none',
                    isRotating: e.target.checked ? d.isRotating : false,
                  }))
                }
                disabled={isSubmitting}
                className="w-4 h-4 accent-sage"
              />
              <span className="text-sm font-medium text-text-primary">Recurring task</span>
            </label>

            {formData.recurrence !== 'none' && (
              <select
                value={formData.recurrence}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, recurrence: e.target.value as RecurrencePattern }))
                }
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-sm border border-divider bg-surface text-text-primary text-sm transition focus:outline-none focus:border-sage"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>

          {formData.recurrence !== 'none' && (
            <label className="flex items-center gap-2 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={formData.isRotating}
                onChange={(e) => setFormData((d) => ({ ...d, isRotating: e.target.checked }))}
                disabled={isSubmitting}
                className="w-4 h-4 accent-sage"
              />
              <span className="text-sm text-text-primary">Rotate assignment among members</span>
              <span className="text-xs text-text-secondary">(round-robin)</span>
            </label>
          )}
        </div>

        {/* Error display */}
        {displayError && (
          <div className="text-sm text-urgent">{displayError}</div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end mt-2">
          {mode === 'edit' && onRequestDelete && (
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-sm border border-urgent text-urgent font-medium transition hover:bg-urgent/10 disabled:opacity-60"
            >
              Delete
            </button>
          )}

          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.assigneeId}
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create Task'
                : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-[400px] bg-surface rounded-md shadow-lg border border-divider p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Unsaved Changes
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              You have unsaved changes. Are you sure you want to close this modal?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowUnsavedConfirm(false)}>
                Keep Editing
              </Button>
              <Button variant="danger" onClick={confirmClose}>
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
}

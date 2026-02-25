'use client';

import { useEffect, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

type Props = {
  open: boolean;
  taskTitle: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onComplete: (input: { notes?: string }) => void | Promise<void>;
};

export default function CompleteTaskModal({
  open,
  taskTitle,
  isSubmitting,
  error,
  onClose,
  onComplete,
}: Props) {
  const [notes, setNotes] = useState('');
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      setNotes('');
      return;
    }
    queueMicrotask(() => notesRef.current?.focus());
  }, [open]);

  async function submit() {
    await onComplete({ notes: notes.trim() || undefined });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Complete task"
      title="Mark as Complete"
      subtitle={taskTitle}
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[480px]"
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Notes"
          htmlFor="completion-notes"
          hint="Optional — add any details about this completion"
        >
          <textarea
            ref={notesRef}
            id="completion-notes"
            placeholder="e.g., Cleaned the kitchen and took out the trash..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className={`${inputClass} min-h-[100px] resize-y`}
          />
        </Field>

        {error && (
          <div className="text-sm text-urgent">{error}</div>
        )}

        <div className="flex gap-3 justify-end mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            lift
            onClick={submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Completing…' : 'Mark Complete'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

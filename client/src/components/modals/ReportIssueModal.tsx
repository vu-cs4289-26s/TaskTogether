'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type IssueType = 'maintenance' | 'conflict' | 'noise' | 'cleanliness' | 'other';
export type IssuePriority = 'urgent' | 'medium' | 'low';

export type ReportIssueFormValues = {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  description: string;
  anonymous: boolean;
};

type Props = {
  open: boolean;
  initialValue?: Partial<ReportIssueFormValues>;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: ReportIssueFormValues) => void | Promise<void>;
};

export default function ReportIssueModal({
  open,
  initialValue,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const defaults = useMemo(
    () => ({
      title: initialValue?.title ?? '',
      type: initialValue?.type ?? 'maintenance',
      priority: initialValue?.priority ?? 'medium',
      description: initialValue?.description ?? '',
      anonymous: initialValue?.anonymous ?? false,
    }),
    [initialValue]
  );

  const [title, setTitle] = useState(defaults.title);
  const [type, setType] = useState<IssueType>(defaults.type);
  const [priority, setPriority] = useState<IssuePriority>(defaults.priority);
  const [description, setDescription] = useState(defaults.description);
  const [anonymous, setAnonymous] = useState(defaults.anonymous);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(defaults.title);
    setType(defaults.type);
    setPriority(defaults.priority);
    setDescription(defaults.description);
    setAnonymous(defaults.anonymous);
    setLocalError(null);
  }, [open, defaults]);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) return setLocalError('Issue title is required.');
    if (!description.trim()) return setLocalError('Description is required.');
    setLocalError(null);

    await onSubmit({
      title: trimmed,
      type,
      priority,
      description: description.trim(),
      anonymous,
    });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Report an issue"
      title="Report an Issue"
      subtitle="Report a household issue or conflict"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
    >

      <div className="flex flex-col gap-4">
        <Field label="Issue Title" required htmlFor="issue-title">
          <input
            id="issue-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g., Broken dishwasher"
            className={inputClass}
          />
        </Field>

        <Field label="Issue Type" required htmlFor="issue-type">
          <select
            id="issue-type"
            value={type}
            onChange={(e) => setType(e.target.value as IssueType)}
            disabled={isSubmitting}
            className={inputClass}
          >
            <option value="maintenance">Maintenance</option>
            <option value="conflict">Housemate Conflict</option>
            <option value="noise">Noise Complaint</option>
            <option value="cleanliness">Cleanliness</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-sage flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
            Priority <span className="text-urgent">*</span>
          </div>
          <div className="flex gap-2">
            <PriorityPill
              label="Urgent"
              selected={priority === 'urgent'}
              tone="high"
              onClick={() => setPriority('urgent')}
              disabled={isSubmitting}
            />
            <PriorityPill
              label="Medium"
              selected={priority === 'medium'}
              tone="medium"
              onClick={() => setPriority('medium')}
              disabled={isSubmitting}
            />
            <PriorityPill
              label="Low"
              selected={priority === 'low'}
              tone="low"
              onClick={() => setPriority('low')}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <Field label="Description" required htmlFor="issue-description">
          <textarea
            id="issue-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            placeholder="Please describe the issue in detail..."
            className={`${inputClass} min-h-[120px] resize-y`}
          />
        </Field>

        <div className="flex items-center gap-2">
          <input
            id="issue-anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            disabled={isSubmitting}
            className="w-5 h-5 cursor-pointer"
          />
          <label htmlFor="issue-anonymous" className="text-sm text-text-primary">
            Report anonymously
          </label>
        </div>

        {(localError || error) && (
          <div className="text-sm text-urgent">{localError ?? error}</div>
        )}

        <div className="flex items-center gap-4 justify-end mt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            lift
            onClick={submit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

function PriorityPill({
  label,
  selected,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  tone: 'high' | 'medium' | 'low';
  onClick: () => void;
  disabled?: boolean;
}) {
  const base =
    'flex-1 px-4 py-2 rounded-sm border-2 text-center font-medium transition select-none';
  const idle = 'border-divider hover:border-sage';
  const selectedTone =
    tone === 'high'
      ? 'border-urgent bg-urgent/10 text-urgent font-semibold'
      : tone === 'medium'
        ? 'border-pending bg-pending/10 text-pending font-semibold'
        : 'border-success bg-success/10 text-success font-semibold';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${selected ? selectedTone : idle} disabled:opacity-60 disabled:cursor-not-allowed`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
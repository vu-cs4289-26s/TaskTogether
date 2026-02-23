'use client';

import { useEffect, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string }) => void | Promise<void>;
};

export default function AddHouseholdModal({
  open,
  isSubmitting,
  error,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setLocalError(null);
      return;
    }
    queueMicrotask(() => nameInputRef.current?.focus());
  }, [open]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError('Household name is required.');
      return;
    }
    setLocalError(null);
    await onCreate({ name: trimmed, description: description.trim() || undefined });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Create new household"
      title="Create New Household"
      subtitle="Set up your household and invite members"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Household Name"
          htmlFor="household-name"
          required
          error={null}
          hint="Example: Main Street Apartment"
        >
          <input
            ref={nameInputRef}
            id="household-name"
            type="text"
            placeholder="e.g., Main Street Apartment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Description" htmlFor="household-description" hint="Optional">
          <textarea
            id="household-description"
            placeholder="Add details about this household..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className={`${inputClass} min-h-[100px] resize-y`}
          />
        </Field>

        <div className="mt-2 p-4 rounded-sm border-l-4 border-sage bg-gradient-to-br from-sage/5 to-terracotta/5">
          <div className="text-base font-heading font-semibold text-sage">
            Invite Members
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            You can invite more members later
          </p>

          <div className="mt-3 flex gap-2">
            <input
              type="email"
              placeholder="member@email.com"
              disabled
              className="flex-1 px-4 py-3 rounded-sm border border-divider bg-base text-text-primary opacity-70"
            />
            <Button
              type="button"
              variant="secondary"
              disabled
              className="px-5 py-3 opacity-60 cursor-not-allowed"
              title="Invites will be wired up later"
            >
              Add
            </Button>
          </div>
        </div>

        {(localError || error) && (
          <div className="mt-1 text-sm text-urgent">{localError ?? error}</div>
        )}

        <div className="flex gap-3 justify-end mt-4">
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
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Creating…' : 'Create Household'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
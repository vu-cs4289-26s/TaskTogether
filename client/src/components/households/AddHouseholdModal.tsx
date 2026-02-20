'use client';

import { useEffect, useRef, useState } from 'react';

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

  if (!open) return null;

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
      aria-label="Create new household"
    >
      <div className="w-full max-w-[560px] bg-surface rounded-md shadow-lg border border-divider p-8">
        <div className="mb-6 pb-6 border-b-4 border-sage">
          <h2 className="text-2xl font-heading font-semibold text-sage">
            Create New Household
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Set up your household and invite members
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="household-name"
              className="text-sm font-medium text-sage flex items-center gap-2"
            >
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Household Name <span className="text-red-600">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="household-name"
              type="text"
              placeholder="e.g., Main Street Apartment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="household-description"
              className="text-sm font-medium text-sage flex items-center gap-2"
            >
              <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
              Description (Optional)
            </label>
            <textarea
              id="household-description"
              placeholder="Add details about this household..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px] px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition resize-y focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
            />
          </div>

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
              <button
                type="button"
                disabled
                className="px-5 py-3 rounded-sm border border-divider bg-transparent text-text-primary opacity-60 cursor-not-allowed"
                title="Invites will be wired up later"
              >
                Add
              </button>
            </div>
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
              disabled={isSubmitting || !name.trim()}
              className="px-6 py-3 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Creating…' : 'Create Household'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

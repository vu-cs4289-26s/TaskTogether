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
  onJoin: (code: string) => void | Promise<void>;
};

export default function JoinHouseholdModal({
  open,
  isSubmitting,
  error,
  onClose,
  onJoin,
}: Props) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCode('');
      setLocalError(null);
      return;
    }
    queueMicrotask(() => codeInputRef.current?.focus());
  }, [open]);

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) {
      setLocalError('Invite code is required.');
      return;
    }
    setLocalError(null);
    await onJoin(trimmed);
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Join a household"
      title="Join a Household"
      subtitle="Enter an invite code to join an existing household"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[480px]"
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Invite Code"
          htmlFor="invite-code"
          required
          hint="Ask a household admin for the invite code"
        >
          <input
            ref={codeInputRef}
            id="invite-code"
            type="text"
            placeholder="e.g., A1B2C3D4"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isSubmitting}
            className={`${inputClass} font-mono text-lg tracking-wider text-center uppercase`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.trim()) submit();
            }}
          />
        </Field>

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
            disabled={isSubmitting || !code.trim()}
          >
            {isSubmitting ? 'Joining…' : 'Join Household'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

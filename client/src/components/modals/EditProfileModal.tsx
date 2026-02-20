'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type EditProfileInput = {
  fullName: string;
  email: string;
  phone?: string;
  username?: string;
};

type Props = {
  open: boolean;
  initialValue: EditProfileInput;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: EditProfileInput) => void | Promise<void>;
  onDeleteAccount?: () => void | Promise<void>;
};

export default function EditProfileModal({
  open,
  initialValue,
  isSubmitting,
  error,
  onClose,
  onSave,
  onDeleteAccount,
}: Props) {
  const defaults = useMemo(
    () => ({
      fullName: initialValue.fullName ?? '',
      email: initialValue.email ?? '',
      phone: initialValue.phone ?? '',
      username: initialValue.username ?? '',
    }),
    [initialValue]
  );

  const [fullName, setFullName] = useState(defaults.fullName);
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [username, setUsername] = useState(defaults.username);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(defaults.fullName);
    setEmail(defaults.email);
    setPhone(defaults.phone);
    setUsername(defaults.username);
    setLocalError(null);
  }, [open, defaults]);

  async function submit() {
    if (!fullName.trim()) return setLocalError('Full name is required.');
    if (!email.trim()) return setLocalError('Email is required.');
    setLocalError(null);

    await onSave({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      username: username.trim() || undefined,
    });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Edit profile"
      title="Edit Profile"
      subtitle="Update your personal information"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[520px]"
    >
      <div className="flex flex-col gap-4">
        <Field label="Full Name" required htmlFor="profile-name">
          <input
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
            placeholder="Jordan Davis"
          />
        </Field>

        <Field label="Email" required htmlFor="profile-email">
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
            placeholder="jordan.davis@email.com"
          />
        </Field>

        <Field label="Phone Number" htmlFor="profile-phone">
          <input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
            placeholder="(555) 123-4567"
          />
        </Field>

        <Field label="Username" htmlFor="profile-username">
          <input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
            placeholder="Choose a username"
          />
        </Field>

        <div className="mt-2 p-4 rounded-sm bg-soft-highlight border border-divider">
          <div className="text-sm font-semibold text-text-primary">Danger Zone</div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Deleting your account is permanent and cannot be undone.
          </p>

          <Button
            variant="danger"
            fullWidth
            className="mt-3"
            disabled={!onDeleteAccount || isSubmitting}
            onClick={onDeleteAccount}
          >
            Delete Account
          </Button>
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
            disabled={isSubmitting || !fullName.trim() || !email.trim()}
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
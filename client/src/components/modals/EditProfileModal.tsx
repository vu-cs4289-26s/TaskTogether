'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import Avatar from '@/components/ui/Avatar';
import useImageUpload from '@/hooks/useImageUpload';
import { uploadImageApi } from '@/lib/upload.api';

export type EditProfileInput = {
  name: string;
  avatar?: string | null;
};

type Props = {
  open: boolean;
  initialValue: EditProfileInput;
  userKey?: string | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: EditProfileInput) => void | Promise<void>;
  onDeleteAccount?: () => void | Promise<void>;
};

export default function EditProfileModal({
  open,
  initialValue,
  userKey,
  isSubmitting,
  error,
  onClose,
  onSave,
  onDeleteAccount,
}: Props) {
  const defaults = useMemo(
    () => ({
      name: initialValue.name ?? '',
      avatar: initialValue.avatar ?? null,
    }),
    [initialValue]
  );

  const [name, setName] = useState(defaults.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaults.avatar);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { previews, addFiles, clearPreviews, uploadError, setUploadError } =
    useImageUpload(1);

  useEffect(() => {
    if (!open) return;
    setName(defaults.name);
    setAvatarUrl(defaults.avatar);
    setLocalError(null);
    setUploadError(null);
    clearPreviews();
  }, [open, defaults, clearPreviews, setUploadError]);

  const previewUrl = previews[0]?.url ?? avatarUrl ?? null;
  const hasNewFile = previews.length > 0;

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFiles(files);
    e.target.value = '';
  }

  function removePhoto() {
    clearPreviews();
    setAvatarUrl(null);
  }

  async function submit() {
    if (!name.trim()) {
      setLocalError('Name is required.');
      return;
    }
    setLocalError(null);

    let nextAvatar: string | null | undefined = undefined;

    try {
      if (hasNewFile) {
        const file = previews[0].file;
        const url = await uploadImageApi(file);
        nextAvatar = url;
      } else if (avatarUrl !== defaults.avatar) {
        // user explicitly removed photo
        nextAvatar = null;
      }
    } catch {
      setLocalError('Failed to upload photo. Please try again.');
      return;
    }

    await onSave({
      name: name.trim(),
      ...(nextAvatar !== undefined ? { avatar: nextAvatar } : {}),
    });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Edit profile"
      title="Edit Profile"
      subtitle="Update your display name and photo"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[520px]"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-5">
          <Avatar
            src={previewUrl}
            name={name || 'User'}
            userKey={userKey}
            size="xl"
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={pickFile}
              disabled={isSubmitting}
            >
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {previewUrl && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={isSubmitting}
                className="text-xs text-text-secondary hover:text-urgent transition-colors text-left"
              >
                Remove photo
              </button>
            )}
            <p className="text-[11px] text-text-secondary">
              JPG/PNG up to 10 MB
            </p>
          </div>
        </div>

        <Field label="Full Name" required htmlFor="profile-name">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
            placeholder="Jordan Davis"
          />
        </Field>

        {onDeleteAccount && (
          <div className="mt-2 p-4 rounded-sm bg-soft-highlight border border-divider">
            <div className="text-sm font-semibold text-text-primary">Danger Zone</div>
            <p className="mt-1 text-[13px] text-text-secondary">
              Deleting your account is permanent and cannot be undone.
            </p>
            <Button
              variant="danger"
              fullWidth
              className="mt-3"
              disabled={isSubmitting}
              onClick={onDeleteAccount}
            >
              Delete Account
            </Button>
          </div>
        )}

        {(localError || uploadError || error) && (
          <div className="text-sm text-urgent">
            {localError ?? uploadError ?? error}
          </div>
        )}

        <div className="flex items-center gap-4 justify-end mt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            lift
            onClick={submit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

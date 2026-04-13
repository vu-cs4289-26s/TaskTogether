'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import PriorityPill from '@/components/ui/PriorityPill';

export type IssueType = 'maintenance' | 'conflict' | 'noise' | 'cleanliness' | 'other';
export type IssuePriority = 'urgent' | 'medium' | 'low';

export type ReportIssueFormValues = {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  description?: string;
  anonymous: boolean;
  photoUrls?: string[];
};

type Preview = { id: string; url: string; file: File };

type Props = {
    open: boolean;
    mode?: 'create' | 'edit';
    initialValue?: ReportIssueFormValues;
    isSubmitting: boolean;
    uploading?: boolean;
    uploadError?: string | null;
    previews?: Preview[];
    onAddFiles?: (filesLike: FileList | File[]) => void;
    onRemovePreview?: (id: string) => void;
    error: string | null;
    onClose: () => void;
    onSubmit: (values: ReportIssueFormValues) => void | Promise<void>;
};

export default function ReportIssueModal({
    open,
    mode = 'create',
    initialValue,
    isSubmitting,
    uploading = false,
    uploadError = null,
    previews = [],
    onAddFiles,
    onRemovePreview,
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
      photoUrls: initialValue?.photoUrls ?? [],
    }),
    [initialValue]
  );

  const [title, setTitle] = useState(defaults.title);
  const [type, setType] = useState<IssueType>(defaults.type);
  const [priority, setPriority] = useState<IssuePriority>(defaults.priority);
  const [description, setDescription] = useState(defaults.description);
  const [anonymous, setAnonymous] = useState(defaults.anonymous);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const busy = isSubmitting || uploading;
  const existingPhotoUrls =
    mode === 'edit'
      ? (initialValue?.photoUrls ?? []).filter((url) => !removedPhotoUrls.includes(url))
      : [];

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && initialValue) {
      setTitle(initialValue.title ?? '');
      setType(initialValue.type ?? 'maintenance');
      setPriority(initialValue.priority ?? 'medium');
      setDescription(initialValue.description ?? '');
      setAnonymous(initialValue.anonymous ?? false);
    } else {
      setTitle('');
      setType('maintenance');
      setPriority('medium');
      setDescription('');
      setAnonymous(false);
    }

    setLocalError(null);
    setIsDragOver(false);
    setRemovedPhotoUrls([]);
  }, [open, mode, initialValue]);

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setLocalError('Issue title is required.');
      return;
    }

    setLocalError(null);

    // For edit mode: combine existing photos that weren't removed with any new uploads handled by parent
    // The parent will handle uploading new previews and merging with existingPhotoUrls
    onSubmit({
      title: trimmedTitle,
      type,
      priority,
      description: description.trim() ? description.trim() : undefined,
      anonymous,
      photoUrls: mode === 'edit' ? existingPhotoUrls : undefined,
    });
  }

    return (
        <BaseModal
            open={open}
            ariaLabel={mode === 'edit' ? 'Edit issue' : 'Report an issue'}
            title={mode === 'edit' ? 'Edit Issue' : 'Report an Issue'}
            subtitle={mode === 'edit' ? undefined : 'Report a household issue or conflict'}
            isBlocking={busy}
            onClose={onClose}
            maxWidthClassName="max-w-[560px]"
        >
            <div className="flex flex-col gap-4">
                <Field label="Issue Title" required htmlFor="issue-title">
                    <input
                        id="issue-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={busy}
                        placeholder="e.g., Broken dishwasher"
                        className={inputClass}
                    />
                </Field>

                <Field label="Issue Type" required htmlFor="issue-type">
                    <select
                        id="issue-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as IssueType)}
                        disabled={busy}
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
                            disabled={busy}
                        />
                        <PriorityPill
                            label="Medium"
                            selected={priority === 'medium'}
                            tone="medium"
                            onClick={() => setPriority('medium')}
                            disabled={busy}
                        />
                        <PriorityPill
                            label="Low"
                            selected={priority === 'low'}
                            tone="low"
                            onClick={() => setPriority('low')}
                            disabled={busy}
                        />
                    </div>
                </div>

                <Field label="Description" htmlFor="issue-description">
                    <textarea
                        id="issue-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={busy}
                        placeholder="Please describe the issue in detail..."
                        className={`${inputClass} min-h-[120px] resize-y`}
                    />
                </Field>

                <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-sage flex items-center gap-2">
                        <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
                        Photo 
                    </div>

                    <div
                        className={[
                            'relative rounded-sm border-2 border-dashed p-5 text-center cursor-pointer transition',
                            'bg-base border-divider hover:border-sage',
                            isDragOver ? 'border-sage bg-sage/5' : '',
                            busy ? 'opacity-60 cursor-not-allowed' : '',
                        ].join(' ')}
                        onClick={() => {
                            if (busy) return;
                            fileInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (busy) return;
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              if (busy) return;
              setIsDragOver(false);
              if (e.dataTransfer.files && onAddFiles) {
                onAddFiles(e.dataTransfer.files);
              }
            }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
            onChange={(e) => {
              if (!e.target.files || !onAddFiles) return;
              onAddFiles(e.target.files);
              e.currentTarget.value = '';
            }}
                            disabled={busy}
                        />

                        <div className="mx-auto mb-2 w-9 h-9 text-sage">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>

            <div className="text-sm font-semibold text-sage">
              {mode === 'edit' ? 'Click to add or drag & drop' : 'Click to upload or drag & drop'}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              PNG, JPG, HEIC up to 10MB each (max 8 photos)
            </div>
                    </div>

      {mode === 'edit' && existingPhotoUrls.length > 0 && previews.length === 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-secondary">
            Current photos ({existingPhotoUrls.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {existingPhotoUrls.map((url, idx) => (
              <div
                key={url}
                className="relative w-[96px] h-[96px] rounded-sm overflow-hidden border border-divider bg-surface"
              >
                <img
                  src={url}
                  alt={`Current issue photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setRemovedPhotoUrls((prev) => [...prev, url])}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center hover:bg-urgent"
                  aria-label={`Remove photo ${idx + 1}`}
                  disabled={busy}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

                    {/* {mode === 'edit' && previews.length > 0 && (
                        <div className="text-xs text-text-secondary">
                            New photo selected. Saving will replace the current image.
                        </div>
                    )} */}

      {previews.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-secondary">
            New photos ({previews.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {previews.map((p) => (
              <div
                key={p.id}
                className="relative w-[72px] h-[72px] rounded-sm overflow-hidden border border-divider bg-surface"
              >
                <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePreview?.(p.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center hover:bg-urgent"
                  aria-label="Remove photo"
                  disabled={busy}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="issue-anonymous"
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        disabled={busy}
                        className="w-5 h-5 cursor-pointer accent-sage"
                    />
                    <label htmlFor="issue-anonymous" className="text-sm text-text-primary">
                        Report anonymously
                    </label>
                </div>

                {(localError || uploadError || error) && (
                    <div className="text-sm text-urgent">{localError ?? uploadError ?? error}</div>
                )}

                <div className="flex items-center gap-4 justify-end mt-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        lift
                        onClick={submit}
                        disabled={busy || !title.trim()}
                    >
                        {uploading
                            ? 'Uploading…'
                            : isSubmitting
                                ? 'Saving…'
                                : mode === 'edit'
                                    ? 'Save Changes'
                                    : 'Submit Report'}
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
}


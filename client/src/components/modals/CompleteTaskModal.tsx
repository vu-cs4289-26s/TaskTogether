'use client';

import { useEffect, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import { uploadImageApi } from '@/lib/upload.api';

type Preview = { id: string; url: string; file: File };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Props = {
  open: boolean;
  taskTitle: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onComplete: (input: { notes?: string; photoUrl?: string }) => void | Promise<void>;
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

  // Photo upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNotes('');
      setPreviews([]);
      setIsDragOver(false);
      setUploading(false);
      setUploadError(null);
      return;
    }
    queueMicrotask(() => notesRef.current?.focus());
  }, [open]);

  function validateFiles(files: File[]) {
    const ok: File[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) continue; // 10 MB
      ok.push(f);
    }
    return ok;
  }

  function addFiles(filesLike: FileList | File[]) {
    const files = validateFiles(Array.from(filesLike));
    if (files.length === 0) return;

    // Only keep the latest photo (single image for task completion)
    // Revoke old previews
    for (const p of previews) URL.revokeObjectURL(p.url);

    const file = files[0];
    const url = URL.createObjectURL(file);
    setPreviews([{ id: uid(), url, file }]);
    setUploadError(null);
  }

  function removePreview(id: string) {
    setPreviews((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function submit() {
    let photoUrl: string | undefined;

    // Upload photo to S3 if one was selected
    if (previews.length > 0) {
      try {
        setUploading(true);
        setUploadError(null);
        photoUrl = await uploadImageApi(previews[0].file);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Image upload failed');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    await onComplete({
      notes: notes.trim() || undefined,
      photoUrl,
    });
  }

  const busy = isSubmitting || uploading;

  return (
    <BaseModal
      open={open}
      ariaLabel="Complete task"
      title="Mark as Complete"
      subtitle={taskTitle}
      isBlocking={busy}
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
            disabled={busy}
            className={`${inputClass} min-h-[100px] resize-y`}
          />
        </Field>

        {/* Photo upload */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-sage flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
            Photo <span className="text-text-secondary font-normal">(optional)</span>
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
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;
                addFiles(e.target.files);
                e.target.value = '';
              }}
              disabled={busy}
            />

            <div className="mx-auto mb-2 w-9 h-9 text-sage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>

            <div className="text-sm font-semibold text-sage">
              Click to upload or drag &amp; drop
            </div>
            <div className="text-xs text-text-secondary mt-1">
              PNG, JPG, HEIC up to 10MB
            </div>
          </div>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((p) => (
                <div
                  key={p.id}
                  className="relative w-[72px] h-[72px] rounded-sm overflow-hidden border border-divider bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePreview(p.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center hover:bg-urgent"
                    aria-label="Remove photo"
                    disabled={busy}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(uploadError || error) && (
          <div className="text-sm text-urgent">{uploadError ?? error}</div>
        )}

        <div className="flex gap-3 justify-end mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            lift
            onClick={submit}
            disabled={busy}
          >
            {uploading ? 'Uploading…' : isSubmitting ? 'Completing…' : 'Mark Complete'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

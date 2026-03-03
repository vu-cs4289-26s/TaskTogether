'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type IssueType = 'maintenance' | 'conflict' | 'noise' | 'cleanliness' | 'other';
export type IssuePriority = 'urgent' | 'medium' | 'low';

export type ReportIssueFormValues = {
    title: string;
    type: IssueType;
    priority: IssuePriority;
    description?: string;
    anonymous: boolean;
    photoUrl?: string | null;
};

type Props = {
    open: boolean;
    mode?: 'create' | 'edit';
    initialValue?: Partial<ReportIssueFormValues>;
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (input: ReportIssueFormValues) => void | Promise<void>;
};

type Preview = { id: string; url: string; file: File };

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Failed to read file.'));
        r.readAsDataURL(file);
    });
}

export default function ReportIssueModal({
    open,
    mode,
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
            photoUrl: initialValue?.photoUrl ?? null,
        }),
        [initialValue]
    );

    const [title, setTitle] = useState(defaults.title);
    const [type, setType] = useState<IssueType>(defaults.type);
    const [priority, setPriority] = useState<IssuePriority>(defaults.priority);
    const [description, setDescription] = useState(defaults.description);
    const [anonymous, setAnonymous] = useState(defaults.anonymous);

    const [localError, setLocalError] = useState<string | null>(null);

    // Upload state
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [photoUrl, setPhotoUrl] = useState<string | null>(defaults.photoUrl);

    useEffect(() => {
        if (!open) return;

        setTitle(defaults.title);
        setType(defaults.type);
        setPriority(defaults.priority);
        setDescription(defaults.description);
        setAnonymous(defaults.anonymous);
        setLocalError(null);

        // reset uploads on open (match your modal reset behavior)
        setPreviews([]);
        setPhotoUrl(defaults.photoUrl ?? null);
        setIsDragOver(false);
    }, [open, defaults]);

    function validateFiles(files: File[]) {
        const ok: File[] = [];
        for (const f of files) {
            if (!f.type.startsWith('image/')) continue;
            // 10MB each, like your mock
            if (f.size > 10 * 1024 * 1024) continue;
            ok.push(f);
        }
        return ok;
    }

    async function addFiles(filesLike: FileList | File[]) {
        const files = validateFiles(Array.from(filesLike));
        if (files.length === 0) return;

        const next: Preview[] = [];
        for (const file of files) {
            const url = URL.createObjectURL(file);
            next.push({ id: uid(), url, file });
        }

        setPreviews((prev) => [...prev, ...next]);

        // For now, store FIRST image as photoUrl (data URL) so backend gets something
        // If you prefer NOT to send image data yet, setPhotoUrl(null) and ignore.
        try {
            const first = files[0];
            const dataUrl = await readAsDataURL(first);
            setPhotoUrl(dataUrl);
        } catch {
            // ignore; user still sees previews
            setPhotoUrl(null);
        }
    }

    function removePreview(id: string) {
        setPreviews((prev) => {
            const found = prev.find((p) => p.id === id);
            if (found) URL.revokeObjectURL(found.url);
            const next = prev.filter((p) => p.id !== id);

            // if removing all, clear photoUrl too
            if (next.length === 0) setPhotoUrl(null);

            return next;
        });
    }

    async function submit() {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return setLocalError('Issue title is required.');

        // Description is optional now: no requirement check
        setLocalError(null);

        await onSubmit({
            title: trimmedTitle,
            type,
            priority,
            description: description.trim() ? description.trim() : undefined,
            anonymous,
            photoUrl, // data URL (demo) or null
        });
    }

    return (
        <BaseModal
            open={open}
            ariaLabel={mode === 'edit' ? 'Edit issue' : 'Report an issue'}
            title={mode === 'edit' ? 'Edit Issue' : 'Report an Issue'}
            subtitle={mode === 'edit' ? undefined : 'Report a household issue or conflict'}
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

                <Field label="Description" htmlFor="issue-description">
                    <textarea
                        id="issue-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Please describe the issue in detail..."
                        className={`${inputClass} min-h-[120px] resize-y`}
                    />
                </Field>

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
                            isSubmitting ? 'opacity-60 cursor-not-allowed' : '',
                        ].join(' ')}
                        onClick={() => {
                            if (isSubmitting) return;
                            fileInputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (isSubmitting) return;
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (isSubmitting) return;
                            setIsDragOver(false);
                            void addFiles(e.dataTransfer.files);
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (!e.target.files) return;
                                void addFiles(e.target.files);
                                // allow selecting same file again
                                e.target.value = '';
                            }}
                            disabled={isSubmitting}
                        />

                        <div className="mx-auto mb-2 w-9 h-9 text-sage">
                            {/* simple image icon */}
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
                            PNG, JPG, HEIC up to 10MB each
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
                                        disabled={isSubmitting}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="issue-anonymous"
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-5 h-5 cursor-pointer accent-sage"
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
                        {isSubmitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Submit Report'}
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
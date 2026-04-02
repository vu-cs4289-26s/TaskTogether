'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import PriorityPill from '@/components/ui/PriorityPill';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type TaskDetailInput = {
    name: string;
    assigneeId: string;
    dueDate: string; // YYYY-MM-DD
    recurrence: TaskRecurrence;
    priority: TaskPriority;
    notes?: string;
};

type MemberOption = { id: string; label: string };

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    members: MemberOption[];

    initialValue?: Partial<TaskDetailInput>;

    isSubmitting: boolean;
    error: string | null;

    onClose: () => void;
    onSave: (input: TaskDetailInput) => void | Promise<void>;

    /** Show delete only if provided (and typically only in edit mode) */
    onDelete?: () => void | Promise<void>;
};

export default function TaskDetailModal({
    open,
    mode,
    members,
    initialValue,
    isSubmitting,
    error,
    onClose,
    onSave,
    onDelete,
}: Props) {
    const defaults = useMemo(
        () => ({
            name: initialValue?.name ?? '',
            assigneeId: initialValue?.assigneeId ?? '',
            dueDate: initialValue?.dueDate ?? '',
            recurrence: initialValue?.recurrence ?? 'none',
            priority: initialValue?.priority ?? 'medium',
            notes: initialValue?.notes ?? '',
        }),
        [initialValue]
    );

    const [name, setName] = useState(defaults.name);
    const [assigneeId, setAssigneeId] = useState(defaults.assigneeId);
    const [dueDate, setDueDate] = useState(defaults.dueDate);
    const [recurrence, setRecurrence] = useState<TaskRecurrence>(defaults.recurrence);
    const [priority, setPriority] = useState<TaskPriority>(defaults.priority);
    const [notes, setNotes] = useState(defaults.notes);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(defaults.name);
        setAssigneeId(defaults.assigneeId);
        setDueDate(defaults.dueDate);
        setRecurrence(defaults.recurrence);
        setPriority(defaults.priority);
        setNotes(defaults.notes);
        setLocalError(null);
    }, [open, defaults]);

    async function submit() {
        const trimmed = name.trim();
        if (!trimmed) return setLocalError('Task name is required.');
        if (!assigneeId) return setLocalError('Assignee is required.');
        if (!dueDate) return setLocalError('Due date is required.');

        setLocalError(null);

        await onSave({
            name: trimmed,
            assigneeId,
            dueDate,
            recurrence,
            priority,
            notes: notes.trim() || undefined,
        });
    }

    return (
        <BaseModal
            open={open}
            ariaLabel="Task details"
            title="Task Details"
            subtitle={mode === 'create' ? 'Create a task' : 'Create or edit a task'}
            isBlocking={isSubmitting}
            onClose={onClose}
            maxWidthClassName="max-w-[560px]"
        >

            <div className="flex flex-col gap-4">
                <Field label="Task Name" required htmlFor="task-name">
                    <input
                        id="task-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="e.g., Vacuum living room"
                        className={inputClass}
                    />
                </Field>

                <Field label="Assign To" required htmlFor="task-assignee">
                    <select
                        id="task-assignee"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        disabled={isSubmitting}
                        className={inputClass}
                    >
                        <option value="">Select member...</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Due Date" required htmlFor="task-due">
                        <input
                            id="task-due"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Recurrence" htmlFor="task-recurrence">
                        <select
                            id="task-recurrence"
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                            disabled={isSubmitting}
                            className={inputClass}
                        >
                            <option value="none">No repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </Field>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium text-sage flex items-center gap-2">
                        <span className="inline-block w-1 h-3.5 rounded-sm bg-terracotta" />
                        Priority <span className="text-urgent">*</span>
                    </div>

                    <div className="flex gap-2">
                        <PriorityPill
                            label="High"
                            selected={priority === 'high'}
                            tone="high"
                            onClick={() => setPriority('high')}
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

                <Field label="Notes" htmlFor="task-notes">
                    <textarea
                        id="task-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Add any additional details..."
                        className={`${inputClass} min-h-[100px] resize-y`}
                    />
                </Field>

                {(localError || error) && (
                    <div className="text-sm text-urgent">{localError ?? error}</div>
                )}

                <div className="flex flex-wrap items-center gap-4 justify-end mt-2">
                    {mode === 'edit' && onDelete && (
                        <Button variant="danger" onClick={onDelete} disabled={isSubmitting}>
                            Delete Task
                        </Button>
                    )}

                    <div className="flex-1" />

                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        lift
                        onClick={submit}
                        disabled={isSubmitting || !name.trim()}
                    >
                        {isSubmitting ? 'Saving…' : 'Save Task'}
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
}


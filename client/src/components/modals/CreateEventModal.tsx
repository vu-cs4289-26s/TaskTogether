'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type HouseholdEventType =
  | 'meeting'
  | 'shared-space'
  | 'social'
  | 'maintenance'
  | 'other';

export type ProfileEventType = 'personal' | 'household';

export type EventType = HouseholdEventType | ProfileEventType;

export type EventDetailInput = {
  name: string;
  type: EventType;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  location: string;    // REQUIRED
  description?: string;
  allDay: boolean;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  context?: 'household' | 'profile';
  initialValue?: Partial<EventDetailInput>;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: EventDetailInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidTime(t: string) {
  return /^\d{2}:\d{2}$/.test(t);
}

function toMinutes(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

function RedStar() {
  return <span className="text-urgent">*</span>;
}

function RequiredLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{text}</span>
      <RedStar />
    </span>
  );
}

export default function CreateEventModal({
  open,
  mode,
  context = 'household',
  initialValue,
  isSubmitting,
  error,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const typeOptions = useMemo(() => {
    if (context === 'profile') {
      return [
        { value: 'personal' as const, label: 'Personal Event' },
        { value: 'household' as const, label: 'Household Event' },
      ];
    }
    return [
      { value: 'meeting' as const, label: 'Meeting' },
      { value: 'shared-space' as const, label: 'Shared Space Booking' },
      { value: 'social' as const, label: 'Social Event' },
      { value: 'maintenance' as const, label: 'Maintenance' },
      { value: 'other' as const, label: 'Other' },
    ];
  }, [context]);

  const defaultType = typeOptions[0]?.value ?? 'other';

  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>(defaultType);
  const [date, setDate] = useState(todayIso());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setLocalError(null);

    setName(initialValue?.name ?? '');
    setType((initialValue?.type as EventType) ?? defaultType);
    setDate(initialValue?.date ?? todayIso());
    setStartTime(initialValue?.startTime ?? '09:00');
    setEndTime(initialValue?.endTime ?? '10:00');
    setLocation(initialValue?.location ?? '');
    setDescription(initialValue?.description ?? '');
    setAllDay(initialValue?.allDay ?? false);
  }, [open, initialValue, defaultType]);

  function validate(): string | null {
    if (!name.trim()) return 'Event name is required.';
    if (!date) return 'Date is required.';
    if (!location.trim()) return 'Location is required.';
    if (!allDay) {
      if (!isValidTime(startTime) || !isValidTime(endTime))
        return 'Start and end time are required.';
      if (toMinutes(endTime) <= toMinutes(startTime))
        return 'End time must be after start time.';
    }
    return null;
  }

  const canSave =
    !!name.trim() &&
    !!date &&
    !!location.trim() &&
    (allDay ||
      (isValidTime(startTime) &&
        isValidTime(endTime) &&
        toMinutes(endTime) > toMinutes(startTime)));

  async function submit() {
    const v = validate();
    if (v) {
      setLocalError(v);
      return;
    }
    setLocalError(null);

    await onSave({
      name: name.trim(),
      type,
      date,
      startTime: allDay ? '' : startTime,
      endTime: allDay ? '' : endTime,
      location: location.trim(),
      description: description.trim() || undefined,
      allDay,
    });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Event details"
      title="Event Details"
      subtitle={mode === 'edit' ? 'Update this event' : 'Add an event to the calendar'}
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[700px]"
    >
      <div className="flex flex-col gap-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
        <Field label={<RequiredLabel text="Event Name" />} htmlFor="event-name">
          <input
            id="event-name"
            className={inputClass}
            placeholder="e.g., Household Meeting"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        <Field label={<RequiredLabel text="Event Type" />} htmlFor="event-type">
          <select
            id="event-type"
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            disabled={isSubmitting}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={<RequiredLabel text="Date" />} htmlFor="event-date">
            <input
              id="event-date"
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <Field label={<RequiredLabel text="Time" />} htmlFor="event-start">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <input
                  id="event-start"
                  type="time"
                  className={inputClass}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isSubmitting || allDay}
                />
                <div className="text-xs text-text-secondary pl-1">Start</div>
              </div>

              <div className="flex flex-col gap-1">
                <input
                  id="event-end"
                  type="time"
                  className={inputClass}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isSubmitting || allDay}
                />
                <div className="text-xs text-text-secondary pl-1">End</div>
              </div>
            </div>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={isSubmitting}
          />
          All day event
        </label>

        <Field label={<RequiredLabel text="Location" />} htmlFor="event-location">
          <input
            id="event-location"
            className={inputClass}
            placeholder="e.g., Living Room"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        <Field label="Description" htmlFor="event-description">
          <textarea
            id="event-description"
            className={`${inputClass} min-h-[110px] resize-y`}
            placeholder="Add event details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        {(localError || error) && (
          <div className="text-sm text-urgent">{localError || error}</div>
        )}

        <div className="flex items-center gap-3 justify-end pt-2">
          {mode === 'edit' && onDelete && (
            <Button variant="danger" onClick={onDelete} disabled={isSubmitting}>
              Delete Event
            </Button>
          )}

          <div className="flex-1" />

          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button variant="primary" lift onClick={submit} disabled={isSubmitting || !canSave}>
            {isSubmitting ? 'Saving…' : 'Save Event'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}

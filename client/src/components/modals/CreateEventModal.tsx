'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import ModalHeader from '@/components/modals/ModalHeader';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type EventType = 'meeting' | 'shared-space' | 'social' | 'maintenance' | 'other';

export type EventDetailInput = {
  name: string;
  type: EventType;
  date: string;
  time: string;
  durationMinutes: 15 | 30 | 60 | 90 | 120;
  location?: string;
  description?: string;
  allDay: boolean;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue?: Partial<EventDetailInput>;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: EventDetailInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
};

export default function EventDetailModal({
  open,
  mode,
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
      type: initialValue?.type ?? 'meeting',
      date: initialValue?.date ?? '',
      time: initialValue?.time ?? '',
      durationMinutes: (initialValue?.durationMinutes ?? 60) as EventDetailInput['durationMinutes'],
      location: initialValue?.location ?? '',
      description: initialValue?.description ?? '',
      allDay: initialValue?.allDay ?? false,
    }),
    [initialValue]
  );

  const [name, setName] = useState(defaults.name);
  const [type, setType] = useState<EventType>(defaults.type);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [durationMinutes, setDurationMinutes] = useState<EventDetailInput['durationMinutes']>(
    defaults.durationMinutes
  );
  const [location, setLocation] = useState(defaults.location);
  const [description, setDescription] = useState(defaults.description);
  const [allDay, setAllDay] = useState(defaults.allDay);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaults.name);
    setType(defaults.type);
    setDate(defaults.date);
    setTime(defaults.time);
    setDurationMinutes(defaults.durationMinutes);
    setLocation(defaults.location);
    setDescription(defaults.description);
    setAllDay(defaults.allDay);
    setLocalError(null);
  }, [open, defaults]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setLocalError('Event name is required.');
    if (!date) return setLocalError('Date is required.');
    if (!allDay && !time) return setLocalError('Time is required.');
    setLocalError(null);

    await onSave({
      name: trimmed,
      type,
      date,
      time: allDay ? '00:00' : time,
      durationMinutes,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      allDay,
    });
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Event details"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
    >
      <ModalHeader
        title="Event Details"
        subtitle={mode === 'create' ? 'Add an event to the calendar' : 'Edit event'}
      />

      <div className="flex flex-col gap-4">
        <Field label="Event Name" required htmlFor="event-name">
          <input
            id="event-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g., Household Meeting"
            className={inputClass}
          />
        </Field>

        <Field label="Event Type" required htmlFor="event-type">
          <select
            id="event-type"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            disabled={isSubmitting}
            className={inputClass}
          >
            <option value="meeting">Meeting</option>
            <option value="shared-space">Shared Space Booking</option>
            <option value="social">Social Event</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Date" required htmlFor="event-date">
            <input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              className={inputClass}
            />
          </Field>

          <Field label="Time" required={!allDay} htmlFor="event-time">
            <input
              id="event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isSubmitting || allDay}
              className={`${inputClass} ${allDay ? 'opacity-60' : ''}`}
            />
          </Field>
        </div>

        <Field label="Duration" required htmlFor="event-duration">
          <select
            id="event-duration"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) as EventDetailInput['durationMinutes'])}
            disabled={isSubmitting}
            className={inputClass}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </Field>

        <Field label="Location" htmlFor="event-location">
          <input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g., Living Room"
            className={inputClass}
          />
        </Field>

        <Field label="Description" htmlFor="event-description">
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            placeholder="Add event details..."
            className={`${inputClass} min-h-[100px] resize-y`}
          />
        </Field>

        <div className="flex items-center gap-2">
          <input
            id="event-all-day"
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={isSubmitting}
            className="w-5 h-5 cursor-pointer"
          />
          <label htmlFor="event-all-day" className="text-sm text-text-primary">
            All day event
          </label>
        </div>

        {(localError || error) && (
          <div className="text-sm text-urgent">{localError ?? error}</div>
        )}

        <div className="flex flex-wrap items-center gap-4 justify-end mt-2">
          {mode === 'edit' && onDelete && (
            <Button variant="danger" onClick={onDelete} disabled={isSubmitting}>
              Delete Event
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
            {isSubmitting ? 'Saving…' : 'Save Event'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
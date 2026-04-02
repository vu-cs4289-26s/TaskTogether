'use client';

// Calendar-only page for Profile events.
// Duplicates the profile calendar logic with minimal refactors.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { useAuth } from '@/contexts/AuthContext';

import CalendarGrid from '@/components/calendar/CalendarGrid';
import ActivityCard from '@/components/calendar/ActivityCard';
import CreateEventModal, { type EventDetailInput } from '@/components/modals/CreateEventModal';
import type { Activity, CreateActivityInput } from '@/types/activities';

import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { loadProfileActivities, saveProfileActivities } from '@/lib/profileActivities';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function buildScheduledAt(input: EventDetailInput) {
  if (input.allDay) return `${input.date}T00:00:00`;
  return `${input.date}T${input.startTime || '00:00'}:00`;
}

function extractTag(desc: string | null | undefined, key: string): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, 'i');
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

function withTags(desc: string | undefined, input: EventDetailInput) {
  const parts: string[] = [];
  const base = (desc ?? '').trim();
  if (base) parts.push(stripTags(base));

  parts.push(`[[TT_TYPE:${input.type}]]`);

  if (input.location?.trim()) {
    parts.push(`[[TT_LOC:${input.location.replace(/\]/g, '').trim()}]]`);
  }

  if (input.allDay) {
    parts.push('[[TT_ALLDAY:1]]');
  } else {
    if (input.endTime) parts.push(`[[TT_END:${input.endTime}]]`);
  }

  return parts.join(' ').trim();
}

function stripTags(desc: string) {
  return desc
    .replace(/\[\[TT_TYPE:[a-z-]+\]\]/gi, '')
    .replace(/\[\[TT_END:[0-9:]+\]\]/gi, '')
    .replace(/\[\[TT_LOC:[^\]]+\]\]/gi, '')
    .replace(/\[\[TT_ALLDAY:1\]\]/gi, '')
    .trim();
}

function prettySubtypeTitle(subtype: string | null): string {
  const s = (subtype ?? '').toLowerCase();
  switch (s) {
    case 'personal':
      return 'Personal Event';
    case 'household':
      return 'Household Event';
    default:
      return s ? s : 'Event';
  }
}

function formatTimeRange(activity: Activity) {
  const start = new Date(activity.scheduledAt);
  const isAllDay = extractTag(activity.description, 'TT_ALLDAY') === '1';
  const endStr = extractTag(activity.description, 'TT_END');

  const datePart = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isAllDay) return `${datePart} • All day`;

  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!endStr) return `${datePart}, ${startTime}`;

  const [hh, mm] = endStr.split(':').map((x) => parseInt(x, 10));
  const end = new Date(start);
  end.setHours(hh || 0, mm || 0, 0, 0);
  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${datePart}, ${startTime} – ${endTime}`;
}

export default function ProfileCalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const error = !loading && !user ? 'Not logged in' : null;

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Personal profile events are persisted locally per signed-in user.
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profileActivitiesLoaded, setProfileActivitiesLoaded] = useState(false);

  // Create modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // Details modal
  const [openEventDetails, setOpenEventDetails] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  // Edit modal
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateEventError, setUpdateEventError] = useState<string | null>(null);

  function openActivity(activityId: string) {
    const found = activities.find((a) => a.id === activityId) ?? null;
    setActiveActivity(found);
    setOpenEventDetails(!!found);
  }

  function closeActivity() {
    setOpenEventDetails(false);
    setActiveActivity(null);
  }

  function goPrevMonth() {
    setSelectedDate(null);
    setCalMonth((m) => {
      if (m === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNextMonth() {
    setSelectedDate(null);
    setCalMonth((m) => {
      if (m === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const activitiesForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKeyLocal(selectedDate);
    return activities
      .filter((a) => dateKeyLocal(new Date(a.scheduledAt)) === key)
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  }, [activities, selectedDate]);

  useEffect(() => {
    if (!user?.id) {
      setActivities([]);
      setProfileActivitiesLoaded(false);
      return;
    }

    setActivities(loadProfileActivities(user.id));
    setProfileActivitiesLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !profileActivitiesLoaded) return;
    saveProfileActivities(user.id, activities);
  }, [activities, user?.id, profileActivitiesLoaded]);

  async function handleCreateEvent(input: EventDetailInput) {
    try {
      setIsCreatingEvent(true);
      setCreateEventError(null);

      const scheduledAt = buildScheduledAt(input);
      const taggedDescription = withTags(input.description?.trim() || undefined, input);

      const createInput: CreateActivityInput = {
        title: input.name,
        description: taggedDescription,
        activityType: 'OTHER',
        scheduledAt,
      };

      const created: Activity = {
        id: `profile-${Date.now()}`,
        title: createInput.title,
        description: createInput.description ?? null,
        activityType: createInput.activityType,
        status: 'SCHEDULED',
        scheduledAt: createInput.scheduledAt,
        startedAt: null,
        completedAt: null,
        householdId: 'profile',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        checkIns: [],
      };

      setActivities((prev) => [created, ...prev]);
      setIsAddEventOpen(false);
    } catch {
      setCreateEventError('Failed to create event.');
    } finally {
      setIsCreatingEvent(false);
    }
  }

  function activityToEventDetailInput(activity: Activity): Partial<EventDetailInput> {
    const scheduled = new Date(activity.scheduledAt);
    const isoDate = `${scheduled.getFullYear()}-${pad2(scheduled.getMonth() + 1)}-${pad2(scheduled.getDate())}`;
    const start = `${pad2(scheduled.getHours())}:${pad2(scheduled.getMinutes())}`;
    const subtype = extractTag(activity.description, 'TT_TYPE')?.toLowerCase() ?? 'personal';
    const isAllDay = extractTag(activity.description, 'TT_ALLDAY') === '1';
    const endTime = extractTag(activity.description, 'TT_END') ?? '';
    const location = extractTag(activity.description, 'TT_LOC') ?? '';

    return {
      name: activity.title,
      type: subtype as EventDetailInput['type'],
      date: isoDate,
      startTime: start,
      endTime,
      location,
      description: activity.description ? stripTags(activity.description) : '',
      allDay: isAllDay,
    };
  }

  async function handleUpdateEvent(input: EventDetailInput) {
    if (!editingActivity) return;
    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);
      const scheduledAt = buildScheduledAt(input);
      const taggedDescription = withTags(input.description?.trim() || undefined, input);
      setActivities((prev) =>
        prev.map((a) =>
          a.id === editingActivity.id
            ? {
                ...a,
                title: input.name,
                scheduledAt,
                description: taggedDescription,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );
      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivity();
    } catch {
      setUpdateEventError('Failed to update event.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  async function handleDeleteEvent() {
    if (!editingActivity) return;
    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);
      const deletingId = editingActivity.id;
      setActivities((prev) => prev.filter((a) => a.id !== deletingId));
      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivity();
    } catch {
      setUpdateEventError('Failed to delete event.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">My Calendar</h1>
          <button
            className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
            type="button"
            onClick={() => router.push('/profile')}
          >
            Back to Profile
          </button>
        </div>

        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Calendar</h2>
            <button
              className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
              type="button"
              onClick={() => {
                setIsAddEventOpen(true);
                setCreateEventError(null);
              }}
              disabled={loading || !!error}
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-base text-text-primary">{monthLabel(calYear, calMonth)}</span>
            <div className="flex gap-2">
              <button
                className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all"
                type="button"
                aria-label="Previous month"
                onClick={goPrevMonth}
              >
                &larr;
              </button>
              <button
                className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all"
                type="button"
                aria-label="Next month"
                onClick={goNextMonth}
              >
                &rarr;
              </button>
            </div>
          </div>

          <CalendarGrid
            year={calYear}
            month={calMonth}
            activities={activities}
            selectedDate={selectedDate}
            onDayClick={(d) => setSelectedDate(d)}
          />

          <div className="mt-5">
            <div className="text-sm font-semibold text-text-primary">
              {selectedDate
                ? `Events on ${selectedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : 'Select a day to see events'}
            </div>

            {selectedDate && activitiesForSelectedDay.length === 0 ? (
              <div className="text-sm text-text-secondary mt-2">No events scheduled for this day.</div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {activitiesForSelectedDay.map((a) => (
                  <ActivityCard key={a.id} activity={a} currentUserId={user?.id} onClick={openActivity} />
                ))}
              </div>
            )}
          </div>

          {/* Legend - matches subtype colors used in CalendarGrid */}
<div className="mt-5 flex flex-wrap gap-4 text-[13px] text-text-secondary">
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-pending" />
    <span>Personal Event</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-terracotta" />
    <span>Household Event</span>
  </div>
</div>
        </div>
      </div>

      <CreateEventModal
        open={isAddEventOpen}
        mode="create"
        context="profile"
        isSubmitting={isCreatingEvent}
        error={createEventError}
        onClose={() => {
          if (!isCreatingEvent) {
            setIsAddEventOpen(false);
            setCreateEventError(null);
          }
        }}
        onSave={handleCreateEvent}
      />

      <CreateEventModal
        open={isEditEventOpen}
        mode="edit"
        context="profile"
        initialValue={editingActivity ? activityToEventDetailInput(editingActivity) : undefined}
        isSubmitting={isUpdatingEvent}
        error={updateEventError}
        onClose={() => {
          if (!isUpdatingEvent) {
            setIsEditEventOpen(false);
            setUpdateEventError(null);
            setEditingActivity(null);
          }
        }}
        onSave={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />

      <BaseModal
        open={openEventDetails}
        ariaLabel="Event details"
        title={activeActivity?.title ?? 'Event Details'}
        subtitle={
          activeActivity
            ? `${prettySubtypeTitle(extractTag(activeActivity.description, 'TT_TYPE'))} • ${formatTimeRange(activeActivity)}`
            : undefined
        }
        onClose={closeActivity}
        maxWidthClassName="max-w-[520px]"
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm text-text-secondary whitespace-pre-wrap">
            {activeActivity?.description ? stripTags(activeActivity.description) : 'No description.'}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!activeActivity) return;
                const deletingId = activeActivity.id;
                setActivities((prev) => prev.filter((a) => a.id !== deletingId));
                closeActivity();
              }}
              disabled={!activeActivity}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!activeActivity) return;
                setEditingActivity(activeActivity);
                setIsEditEventOpen(true);
              }}
              disabled={!activeActivity}
            >
              Edit
            </Button>
            <Button type="button" variant="secondary" onClick={closeActivity}>
              Close
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}

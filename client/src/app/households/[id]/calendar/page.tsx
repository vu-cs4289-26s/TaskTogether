'use client';

// Calendar-only page for a specific household.
// Designed to be a focused view without the rest of the household dashboard.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import AppNavbar from '@/components/shared/AppNavbar';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import ActivityCard from '@/components/calendar/ActivityCard';
import CreateEventModal, { type EventDetailInput } from '@/components/modals/CreateEventModal';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getHousehold } from '@/lib/households';
import {
  listActivitiesApi,
  createActivityApi,
  updateActivityApi,
  deleteActivityApi,
} from '@/lib/activities.api';
import type { Household } from '@/types/households';
import type { Activity, ActivityType, CreateActivityInput } from '@/types/activities';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function mapHouseholdEventTypeToActivityType(t: EventDetailInput['type']): ActivityType {
  if (t === 'maintenance') return 'CHORE';
  if (t === 'social') return 'BONDING';
  return 'OTHER';
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

function stripCalendarTags(desc: string) {
  return desc
    .replace(/\[\[TT_TYPE:[a-z-]+\]\]/gi, '')
    .replace(/\[\[TT_END:[0-9:]+\]\]/gi, '')
    .replace(/\[\[TT_LOC:[^\]]+\]\]/gi, '')
    .replace(/\[\[TT_ALLDAY:1\]\]/gi, '')
    .trim();
}

function safeTagValue(v: string) {
  return v.replace(/\]/g, '').trim();
}

function withCalendarTags(baseDescription: string | undefined, input: EventDetailInput) {
  const parts: string[] = [];
  const base = (baseDescription ?? '').trim();
  if (base) parts.push(stripCalendarTags(base));

  parts.push(`[[TT_TYPE:${safeTagValue(String(input.type))}]]`);
  parts.push(`[[TT_LOC:${safeTagValue(input.location)}]]`);

  if (input.allDay) {
    parts.push('[[TT_ALLDAY:1]]');
  } else if (input.endTime) {
    parts.push(`[[TT_END:${safeTagValue(input.endTime)}]]`);
  }

  return parts.join(' ').trim();
}

function activityToEventDetailInput(activity: Activity): Partial<EventDetailInput> {
  const scheduled = new Date(activity.scheduledAt);
  const isoDate = `${scheduled.getFullYear()}-${pad2(scheduled.getMonth() + 1)}-${pad2(scheduled.getDate())}`;
  const start = `${pad2(scheduled.getHours())}:${pad2(scheduled.getMinutes())}`;

  const taggedType = extractTag(activity.description, 'TT_TYPE')?.toLowerCase() ?? null;
  const isAllDay = extractTag(activity.description, 'TT_ALLDAY') === '1';
  const endTime = extractTag(activity.description, 'TT_END') ?? '';
  const location = extractTag(activity.description, 'TT_LOC') ?? '';

  const fallbackType: EventDetailInput['type'] =
    activity.activityType === 'CHORE'
      ? 'maintenance'
      : activity.activityType === 'BONDING'
        ? 'social'
        : 'other';

  return {
    name: activity.title,
    type: (taggedType as EventDetailInput['type']) ?? fallbackType,
    date: isoDate,
    startTime: start,
    endTime,
    location,
    description: activity.description ? stripCalendarTags(activity.description) : '',
    allDay: isAllDay,
  };
}

export default function HouseholdCalendarPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  const [openEventDetails, setOpenEventDetails] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateEventError, setUpdateEventError] = useState<string | null>(null);
  const isAdmin = household?.myRole === 'ADMIN';

  useEffect(() => {
    if (!id) return;

    async function fetchHouseholdAndActivities() {
      try {
        setIsLoading(true);
        setError(null);

        const h = await getHousehold(id);
        setHousehold(h);
      } catch {
        setError('Failed to load household.');
      } finally {
        setIsLoading(false);
      }

      try {
        setActivitiesLoading(true);
        const { activities: loaded } = await listActivitiesApi(id, { limit: 200 });
        setActivities(loaded);
      } catch {
        // keep empty list
      } finally {
        setActivitiesLoading(false);
      }
    }

    fetchHouseholdAndActivities();
  }, [id]);

  function openActivity(activityId: string) {
    const found = activities.find((a) => a.id === activityId) ?? null;
    setActiveActivity(found);
    setOpenEventDetails(!!found);
  }

  function closeActivityDetails() {
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

  async function handleCreateEvent(input: EventDetailInput) {
    if (!id) return;

    try {
      setIsCreatingEvent(true);
      setCreateEventError(null);

      const scheduledAt = buildScheduledAt(input);
      const activityType = mapHouseholdEventTypeToActivityType(input.type);
      const taggedDescription = withCalendarTags(input.description?.trim() || undefined, input);

      const createInput: CreateActivityInput = {
        title: input.name,
        description: taggedDescription,
        activityType,
        scheduledAt,
      };

      const temp: Activity = {
        id: `temp-${Date.now()}`,
        title: createInput.title,
        description: createInput.description ?? null,
        activityType: createInput.activityType,
        status: 'SCHEDULED',
        scheduledAt: createInput.scheduledAt,
        startedAt: null,
        completedAt: null,
        householdId: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        checkIns: [],
      };

      setActivities((prev) => [temp, ...prev]);
      setIsAddEventOpen(false);

      try {
        const saved = await createActivityApi(id, createInput);
        setActivities((prev) => [saved, ...prev.filter((a) => a.id !== temp.id)]);
      } catch {
        // keep optimistic
      }
    } catch {
      setCreateEventError('Failed to create event.');
    } finally {
      setIsCreatingEvent(false);
    }
  }

  async function handleUpdateEvent(input: EventDetailInput) {
    if (!id || !editingActivity) return;

    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);

      const scheduledAt = buildScheduledAt(input);
      const activityType = mapHouseholdEventTypeToActivityType(input.type);
      const updatedDescription = withCalendarTags(input.description?.trim() || undefined, input);

      const updateInput = {
        title: input.name,
        description: updatedDescription,
        activityType,
        scheduledAt,
      };

      setActivities((prev) =>
        prev.map((a) =>
          a.id === editingActivity.id
            ? {
                ...a,
                title: updateInput.title,
                description: updateInput.description,
                activityType: updateInput.activityType,
                scheduledAt: updateInput.scheduledAt,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );

      try {
        const saved = await updateActivityApi(id, editingActivity.id, updateInput);
        setActivities((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      } catch {
        // keep optimistic
      }

      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivityDetails();
    } catch {
      setUpdateEventError('Failed to update event.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  async function handleDeleteEvent() {
    if (!id || !editingActivity) return;

    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);
      const deletingId = editingActivity.id;
      setActivities((prev) => prev.filter((a) => a.id !== deletingId));
      try {
        await deleteActivityApi(id, deletingId);
      } catch {
        // keep optimistic
      }
      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivityDetails();
    } catch {
      setUpdateEventError('Failed to delete event.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1100px] mx-auto px-6 py-10 text-text-secondary">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1100px] mx-auto px-6 py-10 text-urgent">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Shared Calendar</h1>
            <div className="text-sm text-text-secondary">{household?.name ?? 'Household'}</div>
          </div>
          <button
            className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
            type="button"
            onClick={() => router.push(`/households/${id}`)}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Calendar</h2>
            <button
              onClick={() => {
                setIsAddEventOpen(true);
                setCreateEventError(null);
              }}
              className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage flex items-center gap-2"
              type="button"
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
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">
                {selectedDate
                  ? `Events on ${selectedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  : 'Select a day to see events'}
              </div>
              {activitiesLoading && <div className="text-xs text-text-secondary">Loading…</div>}
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
    <div className="w-3.5 h-3.5 rounded-full bg-info" />
    <span>Meeting</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-terracotta" />
    <span>Shared Space Booking</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-sage" />
    <span>Social Event</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-amber-900" />
    <span>Maintenance</span>
  </div>
  <div className="flex items-center gap-1.5">
    <div className="w-3.5 h-3.5 rounded-full bg-pending" />
    <span>Other</span>
  </div>
</div>
        </div>
      </div>

      <CreateEventModal
        open={isAddEventOpen}
        mode="create"
        context="household"
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
        context="household"
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
        onDelete={isAdmin ? handleDeleteEvent : undefined}
      />

      <BaseModal
        open={openEventDetails}
        ariaLabel="Event details"
        title={activeActivity?.title ?? 'Event Details'}
        subtitle={
          activeActivity
            ? new Date(activeActivity.scheduledAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : undefined
        }
        onClose={closeActivityDetails}
        maxWidthClassName="max-w-[520px]"
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm text-text-secondary whitespace-pre-wrap">
            {activeActivity?.description ? stripCalendarTags(activeActivity.description) : 'No description.'}
          </div>

          <div className="flex justify-end gap-2">
            {isAdmin && (
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  if (!id || !activeActivity) return;
                  setIsUpdatingEvent(true);
                  setUpdateEventError(null);
                  const deletingId = activeActivity.id;
                  setActivities((prev) => prev.filter((a) => a.id !== deletingId));
                  try {
                    await deleteActivityApi(id, deletingId);
                  } catch {
                    // keep optimistic
                  } finally {
                    setIsUpdatingEvent(false);
                    closeActivityDetails();
                  }
                }}
                disabled={!activeActivity || isUpdatingEvent}
              >
                Delete
              </Button>
            )}

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

            <Button type="button" variant="secondary" onClick={closeActivityDetails}>
              Close
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}

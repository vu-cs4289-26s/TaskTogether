'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Plus, Maximize2 } from 'lucide-react';
import EditProfileModal from '@/components/modals/EditProfileModal';
import { updateProfileApi } from '@/lib/user.api';
import Avatar from '@/components/ui/Avatar';

import CalendarGrid from '@/components/calendar/CalendarGrid';
import ActivityCard from '@/components/calendar/ActivityCard';
import CreateEventModal, { type EventDetailInput } from '@/components/modals/CreateEventModal';
import type { Activity, CreateActivityInput } from '@/types/activities';

import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';

import { listHouseholdsApi } from '@/lib/households.api';
import { listTasksApi, completeTaskApi, updateTaskApi, deleteTaskApi } from '@/lib/tasks.api';
import type { Household } from '@/types/households';
import type { Task, UpdateTaskInput } from '@/types/tasks';
import { buildScheduledAt } from '@/lib/calendarDateTime';
import { isTaskCompleted } from '@/lib/task-helpers';
import { loadProfileActivities, saveProfileActivities } from '@/lib/profileActivities';
import TaskListPanel from '@/components/tasks/TaskListPanel';
import TaskCompletionDetailsModal from '@/components/tasks/TaskCompletionDetailsModal';
import CompleteTaskModal from '@/components/modals/CompleteTaskModal';
import AddTaskModal from '@/components/households/AddTaskModal';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
// ---- tag helpers (same idea as household) ----
function extractTag(desc: string | null | undefined, key: string): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, 'i');
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

function safeTagValue(v: string) {
  return v.replace(/\]/g, '').trim();
}

function withTags(desc: string | undefined, input: EventDetailInput) {
  const parts: string[] = [];
  const base = (desc ?? '').trim();
  if (base) parts.push(stripTags(base));

  parts.push(`[[TT_TYPE:${safeTagValue(String(input.type))}]]`);

  if (input.location?.trim()) {
    parts.push(`[[TT_LOC:${safeTagValue(input.location)}]]`);
  }

  if (input.allDay) {
    parts.push('[[TT_ALLDAY:1]]');
  } else if (input.endTime) {
    parts.push(`[[TT_END:${safeTagValue(input.endTime)}]]`);
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
  const endStr = extractTag(activity.description, 'TT_END'); // "HH:MM"

  const datePart = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isAllDay) return `${datePart} • All day`;

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!endStr) return `${datePart}, ${startTime}`;

  const [hh, mm] = endStr.split(':').map((x) => parseInt(x, 10));
  const end = new Date(start);
  end.setHours(hh || 0, mm || 0, 0, 0);

  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart}, ${startTime} – ${endTime}`;
}


export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const error = !loading && !user ? 'Not logged in' : null;

  // Edit profile modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ---- tasks state ----
  const [households, setHouseholds] = useState<Household[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // completed task details modal
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Complete task modal state
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);

  // ---- fetch households + tasks ----
  const fetchAllTasks = useCallback(async () => {
    if (!user) return;
    try {
      setTasksLoading(true);
      const hsList = await listHouseholdsApi();
      setHouseholds(hsList);

      const taskResults = await Promise.all(
        hsList.map((h) => listTasksApi(h.id, { limit: 50, assignedToMe: true }))
      );

      const combined: Task[] = [];
      taskResults.forEach((r) => {
        combined.push(...r.tasks);
      });

      setAllTasks(combined);
    } catch {
      // non-critical
    } finally {
      setTasksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchAllTasks();
    }
  }, [loading, user, fetchAllTasks]);

  // ---- derived task data ----
  const activeTasks = useMemo(() => allTasks.filter((t) => !isTaskCompleted(t)), [allTasks]);
  const completedTasks = useMemo(() => allTasks.filter((t) => isTaskCompleted(t)), [allTasks]);

  // Helper: find household name for a task
  function getHouseholdName(householdId: string): string {
    return households.find((h) => h.id === householdId)?.name ?? 'Unknown';
  }

  // Helper: find household members for the editing task
  function getMembersForTask(task: Task | null) {
    if (!task) return [];
    const hh = households.find((h) => h.id === task.householdId);
    return hh?.members ?? [];
  }

  // ---- task action handlers ----
  async function handleCompleteTask(input: { notes?: string; photoUrl?: string }) {
    if (!completingTask) return;
    try {
      setIsCompleting(true);
      setCompleteError(null);
      await completeTaskApi(completingTask.householdId, completingTask.id, input);
      setCompletingTask(null);
      await fetchAllTasks();
    } catch {
      setCompleteError('Failed to complete task. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleUpdateTask(input: UpdateTaskInput) {
    if (!editingTask) return;
    try {
      setIsEditingTask(true);
      setEditTaskError(null);
      await updateTaskApi(editingTask.householdId, editingTask.id, input);
      setEditingTask(null);
      await fetchAllTasks();
    } catch {
      setEditTaskError('Failed to update task. Please try again.');
    } finally {
      setIsEditingTask(false);
    }
  }

  async function handleDeleteTask() {
    if (!editingTask) return;
    try {
      setIsEditingTask(true);
      setEditTaskError(null);
      await deleteTaskApi(editingTask.householdId, editingTask.id);
      setEditingTask(null);
      await fetchAllTasks();
    } catch {
      setEditTaskError('Failed to delete task. Please try again.');
    } finally {
      setIsEditingTask(false);
    }
  }

  // calendar state
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Personal profile events are persisted locally per signed-in user.
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profileActivitiesLoaded, setProfileActivitiesLoaded] = useState(false);

  // modal state (create)
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // modal state (edit/delete)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateEventError, setUpdateEventError] = useState<string | null>(null);

  // Event details modal state
  const [openEventDetails, setOpenEventDetails] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  // ---- profile update handler ----
  async function handleSaveProfile(input: { name: string; avatar?: string | null }) {
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      await updateProfileApi(input);
      await refreshUser();
      setIsEditProfileOpen(false);
    } catch {
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openActivity(activityId: string) {
    const found = activities.find((a) => a.id === activityId) ?? null;
    setActiveActivity(found);
    setOpenEventDetails(!!found);
  }

  function closeActivity() {
    setOpenEventDetails(false);
    setActiveActivity(null);
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

      // store type + end time tags for dots + modal time range
      const taggedDescription = withTags(input.description?.trim() || undefined, input);

      const createInput: CreateActivityInput = {
        title: input.name,
        description: taggedDescription,
        activityType: 'OTHER', // CalendarGrid uses TT_TYPE for color
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

  // ---- compute total members across all households ----
  const totalMembers = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    for (const h of households) {
      for (const m of h.members) {
        uniqueUserIds.add(m.userId);
      }
    }
    return uniqueUserIds.size;
  }, [households]);

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="bg-surface border-b border-divider px-6 py-8">
      <div className="max-w-[1400px] mx-auto flex items-center gap-6">
        <Avatar
          src={user?.avatar}
          name={user?.name || 'User'}
          userKey={user?.id}
          size="xl"
          className="border-4 border-divider"
        />

          <div className="flex-1">
            <h1 className="text-[32px] font-heading font-bold mb-1">
              {loading ? 'Loading…' : user?.name ?? 'Unknown User'}
            </h1>

            <p className="text-text-secondary text-sm mb-3">{loading ? '' : user?.email ?? ''}</p>

            {error && (
              <div className="mt-2 inline-block px-3 py-2 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-6 mt-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{tasksLoading ? '–' : activeTasks.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Active Tasks</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{tasksLoading ? '–' : households.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Households</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{tasksLoading ? '–' : completedTasks.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Completed</span>
              </div>
            </div>
          </div>

        <button
          className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage disabled:opacity-60"
          disabled={loading || !!error}
          type="button"
          onClick={() => setIsEditProfileOpen(true)}
        >
          <Pencil className="w-4 h-4" />
          Edit Profile
        </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Section */}
        <TaskListPanel
          title="My Tasks"
          tasks={allTasks}
          loading={tasksLoading}
          currentUserId={user?.id}
          onComplete={(task) => setCompletingTask(task)}
          onEdit={(task) => setEditingTask(task)}
          onViewCompleted={(task) => setViewingTask(task)}
          canEdit={(task) => task.assignments.some((a) => a.userId === user?.id)}
          getSubtitle={(task) => getHouseholdName(task.householdId)}
          emptyMessage="No tasks assigned to you yet."
          tabCounts={{
            all: allTasks.length,
            pending: activeTasks.length,
            completed: completedTasks.length,
          }}
          headerActions={
            <button
              type="button"
              onClick={() => router.push('/profile/tasks')}
              className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
            >
              Taskboard
            </button>
          }
        />

        {/* Calendar Section */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">My Calendar</h2>
            <div className="flex items-center gap-2">
              <button
  className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
  type="button"
  onClick={() => router.push('/profile/calendar')}
  disabled={loading || !!error}
>
  <Maximize2 className="w-4 h-4" />
  Full Calendar
</button>

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

          <div className="mt-4 flex gap-4 text-[13px] text-text-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-pending" />
              <span>Personal Events</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-terracotta" />
              <span>Household Events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
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

      {/* Edit Event Modal */}
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

      {/* Profile Event Details Modal */}
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
                closeActivity();
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

      {/* Completed Task Details Modal */}
      <TaskCompletionDetailsModal
        task={viewingTask}
        currentUserId={user?.id}
        subtitle={
          viewingTask
            ? `${getHouseholdName(viewingTask.householdId)} • ${
                viewingTask.completions[0]?.completedAt
                  ? `Completed ${new Date(viewingTask.completions[0].completedAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}`
                  : 'Completed'
              }`
            : undefined
        }
        onClose={() => setViewingTask(null)}
      />

      {/* Complete Task Modal */}
      <CompleteTaskModal
        open={!!completingTask}
        taskTitle={completingTask?.title || ''}
        isSubmitting={isCompleting}
        error={completeError}
        onClose={() => {
          if (!isCompleting) {
            setCompletingTask(null);
            setCompleteError(null);
          }
        }}
        onComplete={handleCompleteTask}
      />

      {/* Edit Task Modal */}
      <AddTaskModal
        open={!!editingTask}
        isSubmitting={isEditingTask}
        error={editTaskError}
        members={getMembersForTask(editingTask)}
        editingTask={editingTask}
        onClose={() => {
          if (!isEditingTask) {
            setEditingTask(null);
            setEditTaskError(null);
          }
        }}
        onCreate={async () => {}}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={isEditProfileOpen}
        initialValue={{ name: user?.name || '', avatar: user?.avatar || null }}
        userKey={user?.id}
        isSubmitting={isSavingProfile}
        error={profileError}
        onClose={() => {
          if (!isSavingProfile) {
            setIsEditProfileOpen(false);
            setProfileError(null);
          }
        }}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

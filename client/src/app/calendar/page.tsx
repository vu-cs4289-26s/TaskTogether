'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { getHousehold } from '@/lib/households';
import {
  listTasksApi,
  createTaskApi,
  completeTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from '@/lib/tasks.api';
import type { Household } from '@/types/households';
import { getInitials, getAvatarColor } from '@/types/households';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types/tasks';
import AddTaskModal from '@/components/households/AddTaskModal';
import ManageMembersModal from '@/components/households/ManageMembersModal';
import CompleteTaskModal from '@/components/modals/CompleteTaskModal';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

// report issue feature
import IssuesSection from '@/components/issues/IssueSection';

// Calendar / Activities
import CalendarGrid from '@/components/calendar/CalendarGrid';
import ActivityCard from '@/components/calendar/ActivityCard';
import CreateEventModal, { type EventDetailInput } from '@/components/modals/CreateEventModal';
import {
  listActivitiesApi,
  createActivityApi,
  updateActivityApi,
  deleteActivityApi,
} from '@/lib/activities.api';
import type { Activity, ActivityType, CreateActivityInput } from '@/types/activities';

const priorityStyles: Record<string, string> = {
  high: 'bg-urgent/10 text-urgent border border-urgent',
  medium: 'bg-pending/10 text-pending border border-pending',
  low: 'bg-success/10 text-success border border-success',
};

const priorityLabels: Record<string, string> = { high: 'P1', medium: 'P2', low: 'P3' };

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isTaskCompleted(task: Task): boolean {
  return task.completions.length > 0 || task.assignments.some((a) => a.status === 'COMPLETED');
}

/** -------- Calendar helpers -------- */
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

function withTypeTag(description: string | undefined, type: string) {
  const tag = `[[TT_TYPE:${type}]]`;
  const base = (description ?? '').trim();
  return base ? `${base} ${tag}` : tag;
}

// ---- Household calendar tag helpers (kept local to avoid touching shared types) ----
function extractTag(desc: string | null | undefined, key: string): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, 'i');
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

function stripCalendarTags(desc: string) {
  // Remove our calendar-only tags but preserve any other text the user wrote.
  return desc
    .replace(/\[\[TT_TYPE:[a-z-]+\]\]/gi, '')
    .replace(/\[\[TT_END:[0-9:]+\]\]/gi, '')
    .replace(/\[\[TT_LOC:[^\]]+\]\]/gi, '')
    .replace(/\[\[TT_ALLDAY:1\]\]/gi, '')
    .trim();
}

function safeTagValue(v: string) {
  // Tag values are bracket-delimited; avoid stray closing brackets breaking parsing.
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

function padTime2(n: number) {
  return String(n).padStart(2, '0');
}

function activityToEventDetailInput(activity: Activity): Partial<EventDetailInput> {
  const scheduled = new Date(activity.scheduledAt);
  const isoDate = `${scheduled.getFullYear()}-${pad2(scheduled.getMonth() + 1)}-${pad2(scheduled.getDate())}`;
  const start = `${padTime2(scheduled.getHours())}:${padTime2(scheduled.getMinutes())}`;

  const taggedType = extractTag(activity.description, 'TT_TYPE')?.toLowerCase() ?? null;
  const isAllDay = extractTag(activity.description, 'TT_ALLDAY') === '1';
  const endTime = extractTag(activity.description, 'TT_END') ?? '';
  const location = extractTag(activity.description, 'TT_LOC') ?? '';

  // Reasonable fallback if we don't have a TT_TYPE tag.
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

export default function HouseholdDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();

  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');

  // Add task modal state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  // Manage members modal state
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // Complete task modal state
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);

  /** ---------------- Calendar state ---------------- */
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // Edit/delete event state (household calendar)
  const [openEventDetails, setOpenEventDetails] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateEventError, setUpdateEventError] = useState<string | null>(null);

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

  /** --------------- household + tasks fetch --------------- */
  const fetchHousehold = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getHousehold(id);
      if (data) setHousehold(data);
    } catch {
      // non-critical
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    try {
      setTasksLoading(true);
      const { tasks: data } = await listTasksApi(id, { limit: 50 });
      setTasks(data);
    } catch {
      // non-critical
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!id) {
          if (!cancelled) setHousehold(null);
          return;
        }
        const data = await getHousehold(id);
        if (!cancelled) setHousehold(data);
      } catch {
        if (!cancelled) setError('Failed to load household.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** --------------- activities fetch --------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id) return;
      try {
        setActivitiesLoading(true);
        const res = await listActivitiesApi(id, { page: 1, limit: 200 });
        if (!cancelled) setActivities(res.activities);
      } catch {
        // backend may still be stubbed; keep UI working with optimistic events
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, calYear, calMonth]);

  /** --------------------- derived data --------------------- */
  const members = useMemo(
    () => (Array.isArray(household?.members) ? household!.members : []),
    [household]
  );

  const memberCount = members.length;
  const name = household?.name?.trim() || 'Untitled household';
  const isAdmin = household?.myRole === 'ADMIN';

  const filteredTasks = useMemo(() => {
    if (activeTab === 'pending') return tasks.filter((t) => !isTaskCompleted(t));
    if (activeTab === 'completed') return tasks.filter((t) => isTaskCompleted(t));
    return tasks;
  }, [tasks, activeTab]);

  /** --------------------- task handlers --------------------- */
  async function handleCreateTask(input: CreateTaskInput) {
    if (!id) return;
    try {
      setIsCreatingTask(true);
      setCreateTaskError(null);
      const created = await createTaskApi(id, input);
      setTasks((prev) => [created, ...prev]);
      setIsAddTaskOpen(false);
    } catch {
      setCreateTaskError('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleCompleteTask(input: { notes?: string; photoUrl?: string }) {
    if (!id || !completingTask) return;
    try {
      setIsCompleting(true);
      setCompleteError(null);
      await completeTaskApi(id, completingTask.id, input);
      setCompletingTask(null);
      await fetchTasks();
    } catch {
      setCompleteError('Failed to complete task. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleUpdateTask(input: UpdateTaskInput) {
    if (!id || !editingTask) return;
    try {
      setIsEditingTask(true);
      setEditTaskError(null);
      await updateTaskApi(id, editingTask.id, input);
      setEditingTask(null);
      await fetchTasks();
    } catch {
      setEditTaskError('Failed to update task. Please try again.');
    } finally {
      setIsEditingTask(false);
    }
  }

  async function handleDeleteTask() {
    if (!id || !editingTask) return;
    try {
      setIsEditingTask(true);
      setEditTaskError(null);
      await deleteTaskApi(id, editingTask.id);
      setEditingTask(null);
      await fetchTasks();
    } catch {
      setEditTaskError('Failed to delete task. Please try again.');
    } finally {
      setIsEditingTask(false);
    }
  }

  function handleMembersChanged() {
    fetchHousehold();
  }

  /** -------------------- calendar handlers -------------------- */
  async function handleCreateEvent(input: EventDetailInput) {
    if (!id) return;

    try {
      setIsCreatingEvent(true);
      setCreateEventError(null);

      const scheduledAt = buildScheduledAt(input);
      const activityType = mapHouseholdEventTypeToActivityType(input.type);

      // Store tags so we can support edit/delete + consistent dot colors.
      const taggedDescription = withCalendarTags(input.description?.trim() || undefined, input);

      const createInput: CreateActivityInput = {
        title: input.name,
        description: taggedDescription,
        activityType,
        scheduledAt,
      };

      // optimistic
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
      setCreateEventError('Failed to create event. Please try again.');
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

      // Optimistic UI update
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
        // If the backend update fails, we keep the optimistic update for now.
      }

      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivityDetails();
    } catch {
      setUpdateEventError('Failed to update event. Please try again.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  async function handleDeleteEvent() {
    if (!id || !editingActivity) return;

    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);

      // Optimistic remove
      const deletingId = editingActivity.id;
      setActivities((prev) => prev.filter((a) => a.id !== deletingId));

      try {
        await deleteActivityApi(id, deletingId);
      } catch {
        // If delete fails, re-fetch activities on next refresh; keep UI consistent for now.
      }

      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivityDetails();
    } catch {
      setUpdateEventError('Failed to delete event. Please try again.');
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  /** --------------------- loading states --------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1400px] mx-auto px-6 py-12 text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1400px] mx-auto px-6 py-12 text-red-600">{error}</div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[900px] mx-auto px-6 py-12">
          <div className="bg-surface border border-divider rounded-md p-6">
            <div className="font-heading font-semibold text-lg">Household not found</div>
            <div className="mt-1 text-text-secondary">
              This household may have been deleted or the link is incorrect.
            </div>
            <button
              className="mt-4 px-6 py-3 rounded-sm bg-sage text-white font-medium hover:bg-sage-hover transition"
              onClick={() => router.push('/households')}
            >
              Back to households
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** --------------------- render --------------------- */
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      {/* Header */}
      <div className="bg-gradient-to-br from-soft-highlight to-surface border-b border-divider px-6 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-4">
            <h1 className="text-[32px] font-heading font-bold mb-2">{name}</h1>

            <div className="flex items-center gap-6 text-sm text-text-secondary flex-wrap">
              <div className="flex gap-1">
                {members.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="w-8 h-8 rounded-full ring-2 ring-divider flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: getAvatarColor(m.user.id) }}
                    title={m.user.name}
                  >
                    {getInitials(m.user.name)}
                  </div>
                ))}
              </div>

              <span>
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
              <span>&bull;</span>
              <span>{isAdmin ? "You're Admin" : 'Member'}</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4 flex-wrap">
            <button
              onClick={() => setIsMembersOpen(true)}
              className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
              </svg>
              Manage Members
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Household Chores</h2>
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Chore
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {['all', 'pending', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-all capitalize ${
                  activeTab === tab ? 'bg-soft-highlight text-text-primary' : 'text-text-secondary hover:bg-base'
                }`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          {tasksLoading ? (
            <div className="text-text-secondary text-sm py-4">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-text-secondary text-sm py-4">
              {activeTab === 'all' ? 'No tasks yet. Add one to get started!' : `No ${activeTab} tasks.`}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTasks.map((task) => {
                const done = isTaskCompleted(task);
                const assignee = task.assignments[0]?.user;
                const priority = task.priority || 'medium';

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm"
                  >
                    <div
                      onClick={() => {
                        if (!done) setCompletingTask(task);
                      }}
                      className={`w-6 h-6 rounded flex-shrink-0 mt-0.5 border-2 transition-all flex items-center justify-center ${
                        done ? 'bg-success border-success text-white cursor-default' : 'border-divider hover:border-sage cursor-pointer'
                      }`}
                    >
                      {done && <span className="text-base leading-none">&#10003;</span>}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold flex-1 ${done ? 'line-through text-text-secondary' : ''}`}>
                          {task.title}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${priorityStyles[priority]}`}>
                          {priorityLabels[priority]}
                        </span>

                        {!done && (task.creatorId === user?.id || isAdmin) && (
                          <div className="flex gap-1 ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                              className="p-1.5 rounded text-text-secondary hover:text-sage hover:bg-sage/10 transition"
                              title="Edit task"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[13px] text-text-secondary flex-wrap">
                        <div className="flex items-center gap-1">
                          {assignee ? (
                            <>
                              <div
                                className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center"
                                style={{ backgroundColor: getAvatarColor(assignee.id) }}
                              >
                                {getInitials(assignee.name)}
                              </div>
                              <span>{assignee.id === user?.id ? 'You' : assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-text-secondary italic">Unassigned</span>
                          )}
                        </div>

                        <span>&bull;</span>
                        <span>{done ? 'Completed' : `Due: ${formatDueDate(task.dueDate)}`}</span>

                        {task.isRecurring && task.recurrencePattern && (
                          <>
                            <span>&bull;</span>
                            <span className="capitalize">{task.recurrencePattern}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shared Calendar */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Shared Calendar</h2>

            <div className="flex items-center gap-2">
              {/*
                Calendar-only page entry point.
              */}
              <button
                onClick={() => {
                  if (id) router.push(`/households/${id}/calendar`);
                }}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
                type="button"
                disabled={!id}
              >
                Full Calendar
              </button>

              <button
                onClick={() => {
                  setIsAddEventOpen(true);
                  setCreateEventError(null);
                }}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
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
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    currentUserId={user?.id}
                    onClick={openActivity}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Legend that matches CalendarGrid tag colors */}
          <div className="mt-5 flex flex-wrap gap-4 text-[13px] text-text-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-info" />
              <span>Meeting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-pending" />
              <span>Shared Space Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sage" />
              <span>Social Event</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-900" />
              <span>Maintenance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-divider" />
              <span>Other</span>
            </div>
          </div>
        </div>

        {/* Issues Section */}
        <IssuesSection householdId={id || ''} isAdmin={isAdmin} />
      </div>

      {/* Modals */}
      <AddTaskModal
        open={isAddTaskOpen}
        isSubmitting={isCreatingTask}
        error={createTaskError}
        members={members}
        onClose={() => {
          if (!isCreatingTask) {
            setIsAddTaskOpen(false);
            setCreateTaskError(null);
          }
        }}
        onCreate={handleCreateTask}
      />

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

      <AddTaskModal
        open={!!editingTask}
        isSubmitting={isEditingTask}
        error={editTaskError}
        members={members}
        editingTask={editingTask}
        onClose={() => {
          if (!isEditingTask) {
            setEditingTask(null);
            setEditTaskError(null);
          }
        }}
        onCreate={handleCreateTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <ManageMembersModal
        open={isMembersOpen}
        householdId={id || ''}
        members={members}
        myRole={household?.myRole ?? 'MEMBER'}
        currentUserId={user?.id ?? ''}
        onClose={() => setIsMembersOpen(false)}
        onMembersChanged={handleMembersChanged}
      />

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

      {/* Household Event Details Modal (click an event card) */}
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
                  // Keep delete separate from edit to match user expectations.
                  setIsUpdatingEvent(true);
                  setUpdateEventError(null);
                  const deletingId = activeActivity.id;
                  setActivities((prev) => prev.filter((a) => a.id !== deletingId));
                  try {
                    await deleteActivityApi(id, deletingId);
                  } catch {
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

      {/* Edit/Delete Event Modal */}
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
    </div>
  );
}

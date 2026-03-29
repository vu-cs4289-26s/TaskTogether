"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNavbar from "@/components/shared/AppNavbar";
import { getHousehold } from "@/lib/households";
import {
  listTasksApi,
  createTaskApi,
  completeTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from "@/lib/tasks.api";
import type { Household } from "@/types/households";
import { getInitials, getAvatarColor } from "@/types/households";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types/tasks";
import { isTaskCompleted } from "@/lib/task-helpers";
import AddTaskModal from "@/components/households/AddTaskModal";
import ManageMembersModal from "@/components/households/ManageMembersModal";
import CompleteTaskModal from "@/components/modals/CompleteTaskModal";
import TaskListPanel from "@/components/tasks/TaskListPanel";
import TaskCompletionDetailsModal from "@/components/tasks/TaskCompletionDetailsModal";
import { useAuth } from "@/contexts/AuthContext";

// report issue feature
import IssuesSection from "@/components/issues/IssueSection";

// Calendar / Activities
import CalendarGrid from "@/components/calendar/CalendarGrid";
import ActivityCard from "@/components/calendar/ActivityCard";
import CreateEventModal, {
  type EventDetailInput,
} from "@/components/modals/CreateEventModal";
import BaseModal from "@/components/modals/BaseModal";
import Button from "@/components/ui/Button";
import { Maximize2, Plus } from "lucide-react";

import {
  listActivitiesApi,
  createActivityApi,
  updateActivityApi,
  deleteActivityApi,
} from "@/lib/activities.api";
import type {
  Activity,
  ActivityType,
  CreateActivityInput,
} from "@/types/activities";


/** -------- Calendar helpers -------- */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// Keep ActivityType mapping for dot fallback,
// BUT we now ALSO store TT_TYPE so CalendarGrid can color differently.
function mapEventTypeToActivityType(t: EventDetailInput["type"]): ActivityType {
  if (t === "maintenance") return "CHORE";
  if (t === "social") return "BONDING";
  // meeting/shared-space/other
  return "OTHER";
}

function buildScheduledAt(input: EventDetailInput) {
  if (input.allDay) return `${input.date}T00:00:00`;
  return `${input.date}T${input.startTime || "00:00"}:00`;
}

function extractTag(
  desc: string | null | undefined,
  key: string,
): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, "i");
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

function prettySubtypeTitle(subtype: string | null): string {
  const s = (subtype ?? "").toLowerCase();
  switch (s) {
    case "meeting":
      return "Meeting";
    case "shared-space":
      return "Shared Space Booking";
    case "social":
      return "Social Event";
    case "maintenance":
      return "Maintenance";
    case "other":
      return "Other";
    default:
      return s ? s : "Event";
  }
}

function formatTimeRange(activity: Activity) {
  const start = new Date(activity.scheduledAt);

  const isAllDay = extractTag(activity.description, "TT_ALLDAY") === "1";
  const endStr = extractTag(activity.description, "TT_END"); // "HH:MM"

  const datePart = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (isAllDay) return `${datePart} • All day`;

  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endStr) return `${datePart}, ${startTime}`;

  // Build a local end Date on same day
  const [hh, mm] = endStr.split(":").map((x) => parseInt(x, 10));
  const end = new Date(start);
  end.setHours(hh || 0, mm || 0, 0, 0);

  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart}, ${startTime} – ${endTime}`;
}

function safeTagValue(v: string) {
  return v.replace(/\]/g, "").trim();
}

// Tag helpers
function withTags(desc: string | undefined, input: EventDetailInput) {
  const parts: string[] = [];
  const base = (desc ?? "").trim();
  if (base) parts.push(stripTags(base));

  parts.push(`[[TT_TYPE:${safeTagValue(String(input.type))}]]`);

  // optional location tag
  if (input.location?.trim()) {
    parts.push(`[[TT_LOC:${safeTagValue(input.location)}]]`);
  }

  if (input.allDay) {
    parts.push("[[TT_ALLDAY:1]]");
  } else if (input.endTime) {
    parts.push(`[[TT_END:${safeTagValue(input.endTime)}]]`);
  }

  return parts.join(" ").trim();
}

function stripTags(desc: string) {
  return desc
    .replace(/\[\[TT_TYPE:[a-z-]+\]\]/gi, "")
    .replace(/\[\[TT_END:[0-9:]+\]\]/gi, "")
    .replace(/\[\[TT_LOC:[^\]]+\]\]/gi, "")
    .replace(/\[\[TT_ALLDAY:1\]\]/gi, "")
    .trim();
}

function activityToEventDetailInput(
  activity: Activity,
): Partial<EventDetailInput> {
  const scheduled = new Date(activity.scheduledAt);
  const isoDate = `${scheduled.getFullYear()}-${pad2(scheduled.getMonth() + 1)}-${pad2(scheduled.getDate())}`;
  const start = `${pad2(scheduled.getHours())}:${pad2(scheduled.getMinutes())}`;

  const taggedType =
    extractTag(activity.description, "TT_TYPE")?.toLowerCase() ?? null;
  const isAllDay = extractTag(activity.description, "TT_ALLDAY") === "1";
  const endTime = extractTag(activity.description, "TT_END") ?? "";
  const location = extractTag(activity.description, "TT_LOC") ?? "";

  const fallbackType: EventDetailInput["type"] =
    activity.activityType === "CHORE"
      ? "maintenance"
      : activity.activityType === "BONDING"
        ? "social"
        : "other";

  return {
    name: activity.title,
    type: (taggedType as EventDetailInput["type"]) ?? fallbackType,
    date: isoDate,
    startTime: start,
    endTime,
    location,
    description: activity.description ? stripTags(activity.description) : "",
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

  // View completed task details modal
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  /** ---------------- Calendar state ---------------- */
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateEventError, setUpdateEventError] = useState<string | null>(null);

  // Event Details Modal state
  const [openEventDetails, setOpenEventDetails] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

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
        if (!cancelled) setError("Failed to load household.");
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
        // backend may still be stubbed; keep UI working with local events
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
    [household],
  );

  const memberCount = members.length;
  const name = household?.name?.trim() || "Untitled household";
  const isAdmin = household?.myRole === "ADMIN";

  const activeTasks = useMemo(() => tasks.filter((t) => !isTaskCompleted(t)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => isTaskCompleted(t)), [tasks]);

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
      setCreateTaskError("Failed to create task. Please try again.");
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleCompleteTask(input: {
    notes?: string;
    photoUrl?: string;
  }) {
    if (!id || !completingTask) return;
    try {
      setIsCompleting(true);
      setCompleteError(null);
      await completeTaskApi(id, completingTask.id, input);
      setCompletingTask(null);
      await fetchTasks();
    } catch {
      setCompleteError("Failed to complete task. Please try again.");
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
      setEditTaskError("Failed to update task. Please try again.");
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
      setEditTaskError("Failed to delete task. Please try again.");
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
      const activityType = mapEventTypeToActivityType(input.type);

      const taggedDescription = withTags(
        input.description?.trim() || undefined,
        input,
      );

      const createInput: CreateActivityInput = {
        title: input.name,
        description: taggedDescription,
        activityType,
        scheduledAt,
      };

      // optimistic: show instantly
      const temp: Activity = {
        id: `temp-${Date.now()}`,
        title: createInput.title,
        description: createInput.description ?? null,
        activityType: createInput.activityType,
        status: "SCHEDULED",
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

      // try backend (if still 501, ignore)
      try {
        const saved = await createActivityApi(id, createInput);
        setActivities((prev) => [
          saved,
          ...prev.filter((a) => a.id !== temp.id),
        ]);
      } catch {
        // keep optimistic
      }
    } catch {
      setCreateEventError("Failed to create event. Please try again.");
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
      const activityType = mapEventTypeToActivityType(input.type);
      const taggedDescription = withTags(
        input.description?.trim() || undefined,
        input,
      );

      const updateInput = {
        title: input.name,
        description: taggedDescription,
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
            : a,
        ),
      );

      // Try backend, but keep optimistic if backend fails
      try {
        const saved = await updateActivityApi(
          id,
          editingActivity.id,
          updateInput,
        );
        setActivities((prev) =>
          prev.map((a) => (a.id === saved.id ? saved : a)),
        );
      } catch {
        // keep optimistic
      }

      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivity();
    } catch {
      setUpdateEventError("Failed to update event. Please try again.");
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  // Delete from either the edit modal or details modal
  async function handleDeleteEvent(activityToDelete?: Activity) {
    if (!id) return;

    const target = activityToDelete ?? editingActivity;
    if (!target) return;

    try {
      setIsUpdatingEvent(true);
      setUpdateEventError(null);

      const deletingId = target.id;

      // Optimistic remove
      setActivities((prev) => prev.filter((a) => a.id !== deletingId));

      try {
        await deleteActivityApi(id, deletingId);
      } catch {}

      setIsEditEventOpen(false);
      setEditingActivity(null);
      closeActivity();
    } catch {
      setUpdateEventError("Failed to delete event. Please try again.");
    } finally {
      setIsUpdatingEvent(false);
    }
  }

  /** --------------------- loading states --------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1400px] mx-auto px-6 py-12 text-text-secondary">
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[1400px] mx-auto px-6 py-12 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[900px] mx-auto px-6 py-12">
          <div className="bg-surface border border-divider rounded-md p-6">
            <div className="font-heading font-semibold text-lg">
              Household not found
            </div>
            <div className="mt-1 text-text-secondary">
              This household may have been deleted or the link is incorrect.
            </div>
            <button
              className="mt-4 px-6 py-3 rounded-sm bg-sage text-white font-medium hover:bg-sage-hover transition"
              onClick={() => router.push("/households")}
            >
              Back to households
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
              <span>&bull;</span>
              <span>{isAdmin ? "You're Admin" : "Member"}</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4 flex-wrap">
            <button
              onClick={() => setIsMembersOpen(true)}
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
        <TaskListPanel
          title="Tasks"
          tasks={tasks}
          loading={tasksLoading}
          currentUserId={user?.id}
          onComplete={(task) => setCompletingTask(task)}
          onEdit={(task) => setEditingTask(task)}
          onViewCompleted={(task) => setViewingTask(task)}
          canEdit={(task) => task.creatorId === user?.id || isAdmin}
          emptyMessage="No tasks yet. Add one to get started!"
          tabCounts={{
            all: tasks.length,
            pending: activeTasks.length,
            completed: completedTasks.length,
          }}
          headerActions={
            <>
              <button
                type="button"
                onClick={() => router.push(`/households/${id}/tasks`)}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
              >
                Taskboard
              </button>
              <button
                onClick={() => setIsAddTaskOpen(true)}
                className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Chore
              </button>
            </>
          }
        />

        {/* Calendar */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Shared Calendar</h2>

            <div className="flex items-center gap-2">
              {/* New: go to the calendar-only page for this household */}
              <button
                type="button"
                onClick={() => router.push(`/households/${id}/calendar`)}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
              >
                <Maximize2 className="w-4 h-4" />
                Full Calendar
              </button>

              {/* Existing: Add Event */}
              <button
                onClick={() => {
                  setIsAddEventOpen(true);
                  setCreateEventError(null);
                }}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-base text-text-primary">
              {monthLabel(calYear, calMonth)}
            </span>
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
                  ? `Events on ${selectedDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : "Select a day to see events"}
              </div>
              {activitiesLoading && (
                <div className="text-xs text-text-secondary">Loading…</div>
              )}
            </div>

            {selectedDate && activitiesForSelectedDay.length === 0 ? (
              <div className="text-sm text-text-secondary mt-2">
                No events scheduled for this day.
              </div>
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

          {/* Legend - matches subtype colors used in CalendarGrid */}
          <div className="mt-5 flex flex-wrap gap-4 text-[13px] text-text-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-info" />
              <span>Meeting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-terracotta" />
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
              <div className="w-2.5 h-2.5 rounded-full bg-pending" />
              <span>Other</span>
            </div>
          </div>
        </div>

        {/* Issues Section */}
        <IssuesSection
          householdId={id || ""}
          isAdmin={isAdmin}
          currentUserId={user?.id}
        />
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
        taskTitle={completingTask?.title || ""}
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
        householdId={id || ""}
        members={members}
        myRole={household?.myRole ?? "MEMBER"}
        currentUserId={user?.id ?? ""}
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

      <CreateEventModal
        open={isEditEventOpen}
        mode="edit"
        context="household"
        initialValue={
          editingActivity
            ? activityToEventDetailInput(editingActivity)
            : undefined
        }
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
      {/* Event Details Modal */}
      <BaseModal
        open={openEventDetails}
        ariaLabel="Event details"
        title={activeActivity?.title ?? "Event Details"}
        subtitle={
          activeActivity
            ? `${prettySubtypeTitle(extractTag(activeActivity.description, "TT_TYPE"))} • ${formatTimeRange(activeActivity)}`
            : undefined
        }
        onClose={closeActivity}
        maxWidthClassName="max-w-[520px]"
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm text-text-secondary whitespace-pre-wrap">
            {activeActivity?.description
              ? stripTags(activeActivity.description)
              : "No description."}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={!activeActivity || isUpdatingEvent}
              onClick={async () => {
                if (!activeActivity) return;
                // Reuse the same delete flow as the edit modal
                setEditingActivity(activeActivity);
                await handleDeleteEvent(activeActivity);
              }}
            >
              Delete
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={!activeActivity}
              onClick={() => {
                if (!activeActivity) return;

                setEditingActivity(activeActivity);
                setIsEditEventOpen(true);

                // close the details modal so only the edit modal shows
                closeActivity();
              }}
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
        onClose={() => setViewingTask(null)}
      />
    </div>
  );
}

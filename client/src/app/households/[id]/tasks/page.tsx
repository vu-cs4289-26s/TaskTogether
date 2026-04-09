"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppNavbar from "@/components/shared/AppNavbar";
import { getHousehold } from "@/lib/households";
import {
  listTasksApi,
  createTaskApi,
  completeTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from "@/lib/tasks.api";
import type { Household, HouseholdMember } from "@/types/households";
import type { Task } from "@/types/tasks";
import TaskLane from "@/components/tasks/TaskLane";
import TaskDetailModal, {
  type TaskDetailInput,
} from "@/components/modals/CreateTaskModal";
import CompleteTaskModal from "@/components/modals/CompleteTaskModal";
import TaskDeleteModal from "@/components/tasks/TaskDeleteModal";
import useDeleteFlow from "@/hooks/useDeleteFlow";
import { Plus, AlertCircle } from "lucide-react";

const LANE_COLORS = [
  { bg: "bg-[#EEF4EF]", accent: "#5A7C5E", border: "border-[#5A7C5E]" }, // sage
  { bg: "bg-[#F5EDEB]", accent: "#B85C4A", border: "border-[#B85C4A]" }, // terracotta
  { bg: "bg-[#EDF2F6]", accent: "#6B8BA4", border: "border-[#6B8BA4]" }, // dusty blue
  { bg: "bg-[#F7F1E6]", accent: "#D1A054", border: "border-[#D1A054]" }, // mustard
  { bg: "bg-[#F2EDF5]", accent: "#7C5B8C", border: "border-[#7C5B8C]" }, // plum
  { bg: "bg-[#ECEEF0]", accent: "#5F6B7A", border: "border-[#5F6B7A]" }, // slate
  { bg: "bg-[#F5ECF0]", accent: "#C06C84", border: "border-[#C06C84]" }, // rose
  { bg: "bg-[#ECF5F4]", accent: "#4F9A94", border: "border-[#4F9A94]" }, // teal
  { bg: "bg-[#EDEEF7]", accent: "#6C7BD0", border: "border-[#6C7BD0]" }, // indigo
  { bg: "bg-[#F6EFEC]", accent: "#D87C6A", border: "border-[#D87C6A]" }, // coral
  { bg: "bg-[#F0F3EA]", accent: "#7A8F4E", border: "border-[#7A8F4E]" }, // olive
  { bg: "bg-[#EAF3F8]", accent: "#5AA6C8", border: "border-[#5AA6C8]" }, // sky
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function laneColor(userId: string) {
  return LANE_COLORS[hashStr(userId) % LANE_COLORS.length];
}

export default function TasksPage() {
  const router = useRouter();
  const param = useParams();
  const householdId = typeof param.id === "string" ? param.id : undefined;
  const { user } = useAuth();

  /* ----- State ----- */
  const [household, setHousehold] = useState<Household | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [preselectedAssignee, setPreselectedAssignee] = useState<string>("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Complete modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Delete modal state
  const {
    isDeleteOpen,
    deleteTarget,
    isDeleting,
    setIsDeleting,
    openDelete,
    closeDelete,
    forceCloseDelete,
  } = useDeleteFlow<Task>();

  /* ----- Data fetching ----- */
  const fetchAll = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const [hh, taskData] = await Promise.all([
        getHousehold(householdId),
        listTasksApi(householdId, { limit: 200 }),
      ]);
      setHousehold(hh);
      setTasks(taskData.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ----- Derived data: group tasks by assignee ----- */
  const members = useMemo(() => household?.members ?? [], [household]);

  const memberOptions = useMemo(
    () => members.map((m) => ({ id: m.user.id, label: m.user.name })),
    [members],
  );

  const tasksByMember = useMemo(() => {
    const map = new Map<string, Task[]>();

    // Initialize a bucket for each member
    for (const m of members) {
      map.set(m.user.id, []);
    }
    // Special "unassigned" bucket
    map.set("__unassigned__", []);

    for (const task of tasks) {
      if (task.assignments.length === 0) {
        map.get("__unassigned__")!.push(task);
      } else {
        for (const a of task.assignments) {
          const bucket = map.get(a.userId);
          if (bucket) {
            bucket.push(task);
          } else {
            // Member might have left – put in unassigned
            map.get("__unassigned__")!.push(task);
          }
        }
      }
    }
    return map;
  }, [tasks, members]);

  /* ----- Modal handlers ----- */
  function openCreateModal(assigneeId?: string) {
    setTaskModalMode("create");
    setEditingTask(null);
    setPreselectedAssignee(assigneeId ?? "");
    setTaskError(null);
    setTaskModalOpen(true);
  }

  function openEditModal(task: Task) {
    setTaskModalMode("edit");
    setEditingTask(task);
    setPreselectedAssignee(task.assignments[0]?.userId ?? "");
    setTaskError(null);
    setTaskModalOpen(true);
  }

  function openCompleteModal(task: Task) {
    setCompletingTask(task);
    setCompleteError(null);
    setCompleteModalOpen(true);
  }

  async function handleSaveTask(input: TaskDetailInput) {
    if (!householdId) return;
    setTaskSubmitting(true);
    setTaskError(null);

    try {
      if (taskModalMode === "create") {
        await createTaskApi(householdId, {
          title: input.name,
          description: input.notes,
          dueDate: input.dueDate || undefined,
          priority: input.priority,
          isRecurring: input.recurrence !== "none",
          recurrencePattern:
            input.recurrence !== "none"
              ? (input.recurrence as "daily" | "weekly" | "monthly")
              : undefined,
          assignedToUserId: input.assigneeId || undefined,
        });
      } else if (editingTask) {
        await updateTaskApi(householdId, editingTask.id, {
          title: input.name,
          description: input.notes || null,
          dueDate: input.dueDate || null,
          priority: input.priority,
          isRecurring: input.recurrence !== "none",
          recurrencePattern:
            input.recurrence !== "none"
              ? (input.recurrence as "daily" | "weekly" | "monthly")
              : undefined,
        });
      }
      setTaskModalOpen(false);
      await fetchAll();
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setTaskSubmitting(false);
    }
  }

  function handleDeleteTask() {
    if (!editingTask) return;
    setTaskModalOpen(false);
    openDelete(editingTask);
  }

  async function confirmDeleteTask(taskId: string) {
    if (!householdId) return;
    try {
      setIsDeleting(true);
      await deleteTaskApi(householdId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      forceCloseDelete();
    } catch (err) {
      setTaskError(
        err instanceof Error ? err.message : "Failed to delete task",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCompleteTask(input: {
    notes?: string;
    photoUrl?: string;
  }) {
    if (!householdId || !completingTask) return;
    setCompleteSubmitting(true);
    setCompleteError(null);
    try {
      await completeTaskApi(householdId, completingTask.id, input);
      setCompleteModalOpen(false);
      await fetchAll();
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : "Failed to complete task",
      );
    } finally {
      setCompleteSubmitting(false);
    }
  }

  /* ----- Scroll handling ----- */
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ----- Render ----- */
  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-text-secondary text-sm">
            Loading tasks…
          </div>
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <AlertCircle size={32} className="text-urgent" />
          <p className="text-text-secondary text-sm">
            {error ?? "Household not found"}
          </p>
        </div>
      </div>
    );
  }

  const unassigned = tasksByMember.get("__unassigned__") ?? [];

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <AppNavbar />
      <div className="mx-auto w-full max-w-6xl flex-1 flex flex-col">
        {/* Page header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary">
              Tasks
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {household.name} &middot; {tasks.length} task
              {tasks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-sage text-white text-sm font-medium hover:bg-sage-hover transition-all hover:-translate-y-px"
            >
              <Plus size={16} />
              New Task
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-sage text-white text-sm font-medium hover:bg-sage-hover transition-all hover:-translate-y-px"
              type="button"
              onClick={() => router.push(`/households/${householdId}`)}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Kanban board – infinite horizontal scroll */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6"
        >
          <div className="flex gap-4 h-full min-h-[calc(100vh-160px)]">
            {/* One lane per household member */}
            {members.map((m) => (
              <TaskLane
                key={m.user.id}
                memberAvatar={m.user.avatar}
                memberId={m.user.id}
                memberName={m.user.name}
                tasks={tasksByMember.get(m.user.id) ?? []}
                color={laneColor(m.user.id)}
                onAddTask={() => openCreateModal(m.user.id)}
                onCompleteTask={openCompleteModal}
                onEditTask={openEditModal}
              />
            ))}

            {/* Unassigned lane */}
            {unassigned.length > 0 && (
              <TaskLane
                memberAvatar=""
                memberId="__unassigned__"
                memberName="Unassigned"
                tasks={unassigned}
                color={{
                  bg: "bg-[#F0EFED]",
                  accent: "#999",
                  border: "border-[#999]",
                }}
                onAddTask={() => openCreateModal()}
                onCompleteTask={openCompleteModal}
                onEditTask={openEditModal}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Task Modal */}
      <TaskDetailModal
        open={taskModalOpen}
        mode={taskModalMode}
        members={memberOptions}
        initialValue={
          editingTask
            ? {
                name: editingTask.title,
                assigneeId: editingTask.assignments[0]?.userId ?? "",
                dueDate: editingTask.dueDate
                  ? new Date(editingTask.dueDate).toISOString().split("T")[0]
                  : "",
                recurrence: editingTask.isRecurring
                  ? ((editingTask.recurrencePattern as
                      | "daily"
                      | "weekly"
                      | "monthly") ?? "none")
                  : "none",
                priority:
                  (editingTask.priority as "high" | "medium" | "low") ??
                  "medium",
                notes: editingTask.description ?? "",
              }
            : {
                assigneeId: preselectedAssignee,
              }
        }
        isSubmitting={taskSubmitting}
        error={taskError}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={taskModalMode === "edit" ? handleDeleteTask : undefined}
      />

      {/* Delete Task Modal */}
      <TaskDeleteModal
        open={isDeleteOpen}
        task={deleteTarget}
        isDeleting={isDeleting}
        onClose={closeDelete}
        onConfirm={confirmDeleteTask}
      />

      {/* Complete Task Modal */}
      <CompleteTaskModal
        open={completeModalOpen}
        taskTitle={completingTask?.title ?? ""}
        isSubmitting={completeSubmitting}
        error={completeError}
        onClose={() => setCompleteModalOpen(false)}
        onComplete={handleCompleteTask}
      />
    </div>
  );
}

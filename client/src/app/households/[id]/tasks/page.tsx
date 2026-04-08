'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';
import { getHousehold } from '@/lib/households';
import {
  listTasksApi,
  createTaskApi,
  completeTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from '@/lib/tasks.api';
import type { Household, HouseholdMember } from '@/types/households';
import Avatar from '@/components/ui/Avatar';
import type { Task } from '@/types/tasks';
import { priorityStyles, priorityLabels, formatDueDate, isTaskCompleted, compareTasksByUrgency } from '@/lib/task-helpers';
import TaskDetailModal, { type TaskDetailInput } from '@/components/modals/CreateTaskModal';
import CompleteTaskModal from '@/components/modals/CompleteTaskModal';
import TaskDeleteModal from '@/components/tasks/TaskDeleteModal';
import useDeleteFlow from '@/hooks/useDeleteFlow';
import { CheckCircle2, Pencil, Plus, Calendar, RotateCw, AlertCircle } from 'lucide-react';


const LANE_COLORS = [
  { bg: 'bg-[#EEF4EF]', accent: '#5A7C5E', border: 'border-[#5A7C5E]' },   // sage
  { bg: 'bg-[#F5EDEB]', accent: '#B85C4A', border: 'border-[#B85C4A]' },   // terracotta
  { bg: 'bg-[#EDF2F6]', accent: '#6B8BA4', border: 'border-[#6B8BA4]' },   // dusty blue
  { bg: 'bg-[#F7F1E6]', accent: '#D1A054', border: 'border-[#D1A054]' },   // mustard
  { bg: 'bg-[#F2EDF5]', accent: '#7C5B8C', border: 'border-[#7C5B8C]' },   // plum
  { bg: 'bg-[#ECEEF0]', accent: '#5F6B7A', border: 'border-[#5F6B7A]' },   // slate
  { bg: 'bg-[#F5ECF0]', accent: '#C06C84', border: 'border-[#C06C84]' },   // rose
  { bg: 'bg-[#ECF5F4]', accent: '#4F9A94', border: 'border-[#4F9A94]' },   // teal
  { bg: 'bg-[#EDEEF7]', accent: '#6C7BD0', border: 'border-[#6C7BD0]' },   // indigo
  { bg: 'bg-[#F6EFEC]', accent: '#D87C6A', border: 'border-[#D87C6A]' },   // coral
  { bg: 'bg-[#F0F3EA]', accent: '#7A8F4E', border: 'border-[#7A8F4E]' },   // olive
  { bg: 'bg-[#EAF3F8]', accent: '#5AA6C8', border: 'border-[#5AA6C8]' },   // sky
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function laneColor(userId: string) {
  return LANE_COLORS[hashStr(userId) % LANE_COLORS.length];
}

/* ================================================================== */
/*  TaskCard                                                           */
/* ================================================================== */

function TaskCard({
  task,
  accentColor,
  onComplete,
  onEdit,
}: {
  task: Task;
  accentColor: string;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const completed = isTaskCompleted(task);

  return (
    <div
      className={`group relative bg-surface rounded-sm shadow-sm border-l-[3px] p-3.5 transition hover:shadow-md ${
        completed ? 'opacity-50' : ''
      }`}
      style={{ borderLeftColor: accentColor }}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span
          className={`flex-1 text-sm font-medium leading-snug ${
            completed ? 'line-through text-text-secondary' : 'text-text-primary'
          }`}
        >
          {task.title}
        </span>

        {/* Action buttons – visible on hover */}
        {!completed && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onComplete}
              className="p-1 rounded hover:bg-success/10 text-success transition"
              title="Mark complete"
            >
              <CheckCircle2 size={16} />
            </button>
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-sage/10 text-text-secondary hover:text-sage transition"
              title="Edit task"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.priority && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
              priorityStyles[task.priority] ?? ''
            }`}
          >
            {priorityLabels[task.priority] ?? task.priority}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[11px] text-text-secondary flex items-center gap-0.5">
            <Calendar size={10} />
            {formatDueDate(task.dueDate)}
          </span>
        )}
        {task.isRecurring && (
          <span className="text-[11px] text-info flex items-center gap-0.5" title="Recurring">
            <RotateCw size={10} />
            {task.recurrencePattern}
          </span>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TaskLane – one swimlane per person                                 */
/* ================================================================== */

const MAX_COMPLETED_VISIBLE = 3;

function TaskLane({
  memberId,
  memberName,
  tasks,
  color,
  onAddTask,
  onCompleteTask,
  onEditTask,
}: {
  memberId: string;
  memberName: string;
  tasks: Task[];
  color: { bg: string; accent: string; border: string };
  onAddTask: () => void;
  onCompleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}) {
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const sorted = useMemo(() => [...tasks].sort(compareTasksByUrgency), [tasks]);
  const pending = sorted.filter((t) => !isTaskCompleted(t));
  const allCompleted = sorted.filter((t) => isTaskCompleted(t));
  const completed = showAllCompleted
    ? allCompleted
    : allCompleted.slice(0, MAX_COMPLETED_VISIBLE);
  const hiddenCount = allCompleted.length - MAX_COMPLETED_VISIBLE;

  return (
    <div
      className={`flex-shrink-0 w-[300px] ${color.bg} rounded-md flex flex-col h-full`}
    >
      {/* Lane header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <Avatar
          src={undefined}
          name={memberName}
          userKey={memberId}
          size="sm"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {memberName}
          </h3>
          <span className="text-[11px] text-text-secondary">
            {pending.length} task{pending.length !== 1 ? 's' : ''} open
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-divider" />

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {pending.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            accentColor={color.accent}
            onComplete={() => onCompleteTask(task)}
            onEdit={() => onEditTask(task)}
          />
        ))}

        {/* Completed section */}
        {allCompleted.length > 0 && pending.length > 0 && (
          <div className="flex items-center gap-2 pt-1 pb-0.5">
            <div className="flex-1 border-t border-divider/60" />
            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">
              Done ({allCompleted.length})
            </span>
            <div className="flex-1 border-t border-divider/60" />
          </div>
        )}
        {completed.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            accentColor={color.accent}
            onComplete={() => {}}
            onEdit={() => onEditTask(task)}
          />
        ))}

        {/* Show more / less toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAllCompleted((v) => !v)}
            className="w-full text-center text-[11px] text-text-secondary hover:text-sage font-medium py-1.5 transition"
          >
            {showAllCompleted
              ? 'Show less'
              : `Show ${hiddenCount} more completed`}
          </button>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-sm text-text-secondary">
            No tasks yet
          </div>
        )}
      </div>

      {/* Add task button */}
      <div className="px-3 pb-3 pt-1">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-sm border-2 border-dashed border-divider text-sm font-medium text-text-secondary hover:border-sage hover:text-sage transition"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function TasksPage() {
  const router = useRouter();
  const param = useParams();
  const householdId = typeof param.id === 'string' ? param.id : undefined;
  const { user } = useAuth();

  /* ----- State ----- */
  const [household, setHousehold] = useState<Household | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [preselectedAssignee, setPreselectedAssignee] = useState<string>('');
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
      setError(err instanceof Error ? err.message : 'Failed to load data');
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
    [members]
  );

  const tasksByMember = useMemo(() => {
    const map = new Map<string, Task[]>();

    // Initialize a bucket for each member
    for (const m of members) {
      map.set(m.user.id, []);
    }
    // Special "unassigned" bucket
    map.set('__unassigned__', []);

    for (const task of tasks) {
      if (task.assignments.length === 0) {
        map.get('__unassigned__')!.push(task);
      } else {
        for (const a of task.assignments) {
          const bucket = map.get(a.userId);
          if (bucket) {
            bucket.push(task);
          } else {
            // Member might have left – put in unassigned
            map.get('__unassigned__')!.push(task);
          }
        }
      }
    }
    return map;
  }, [tasks, members]);

  /* ----- Modal handlers ----- */
  function openCreateModal(assigneeId?: string) {
    setTaskModalMode('create');
    setEditingTask(null);
    setPreselectedAssignee(assigneeId ?? '');
    setTaskError(null);
    setTaskModalOpen(true);
  }

  function openEditModal(task: Task) {
    setTaskModalMode('edit');
    setEditingTask(task);
    setPreselectedAssignee(task.assignments[0]?.userId ?? '');
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
      if (taskModalMode === 'create') {
        await createTaskApi(householdId, {
          title: input.name,
          description: input.notes,
          dueDate: input.dueDate || undefined,
          priority: input.priority,
          isRecurring: input.recurrence !== 'none',
          recurrencePattern:
            input.recurrence !== 'none' ? input.recurrence as 'daily' | 'weekly' | 'monthly' : undefined,
          assignedToUserId: input.assigneeId || undefined,
        });
      } else if (editingTask) {
        await updateTaskApi(householdId, editingTask.id, {
          title: input.name,
          description: input.notes || null,
          dueDate: input.dueDate || null,
          priority: input.priority,
          isRecurring: input.recurrence !== 'none',
          recurrencePattern:
            input.recurrence !== 'none' ? input.recurrence as 'daily' | 'weekly' | 'monthly' : undefined,
        });
      }
      setTaskModalOpen(false);
      await fetchAll();
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to save task');
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
      setTaskError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCompleteTask(input: { notes?: string; photoUrl?: string }) {
    if (!householdId || !completingTask) return;
    setCompleteSubmitting(true);
    setCompleteError(null);
    try {
      await completeTaskApi(householdId, completingTask.id, input);
      setCompleteModalOpen(false);
      await fetchAll();
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Failed to complete task');
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
          <div className="animate-pulse text-text-secondary text-sm">Loading tasks…</div>
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
          <p className="text-text-secondary text-sm">{error ?? 'Household not found'}</p>
        </div>
      </div>
    );
  }

  const unassigned = tasksByMember.get('__unassigned__') ?? [];

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <AppNavbar />

      {/* Page header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            Tasks
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {household.name} &middot; {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div 
          className="flex items-center gap-3"> 
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
              memberId="__unassigned__"
              memberName="Unassigned"
              tasks={unassigned}
              color={{ bg: 'bg-[#F0EFED]', accent: '#999', border: 'border-[#999]' }}
              onAddTask={() => openCreateModal()}
              onCompleteTask={openCompleteModal}
              onEditTask={openEditModal}
            />
          )}
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
                assigneeId: editingTask.assignments[0]?.userId ?? '',
                dueDate: editingTask.dueDate
                  ? new Date(editingTask.dueDate).toISOString().split('T')[0]
                  : '',
                recurrence: editingTask.isRecurring
                  ? (editingTask.recurrencePattern as 'daily' | 'weekly' | 'monthly') ?? 'none'
                  : 'none',
                priority: (editingTask.priority as 'high' | 'medium' | 'low') ?? 'medium',
                notes: editingTask.description ?? '',
              }
            : {
                assigneeId: preselectedAssignee,
              }
        }
        isSubmitting={taskSubmitting}
        error={taskError}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={taskModalMode === 'edit' ? handleDeleteTask : undefined}
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
        taskTitle={completingTask?.title ?? ''}
        isSubmitting={completeSubmitting}
        error={completeError}
        onClose={() => setCompleteModalOpen(false)}
        onComplete={handleCompleteTask}
      />
    </div>
  );
}

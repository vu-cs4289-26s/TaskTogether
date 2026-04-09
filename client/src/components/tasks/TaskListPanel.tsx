'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import Avatar from '@/components/ui/Avatar';
import {
  priorityStyles,
  priorityLabels,
  formatDueDate,
  isTaskCompleted,
  compareTasksByUrgency,
} from '@/lib/task-helpers';
import type { Task } from '@/types/tasks';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  /** Panel heading — e.g. "Tasks" or "My Tasks" */
  title: string;
  tasks: Task[];
  loading: boolean;
  currentUserId?: string;

  /* ---- behavioural callbacks (all optional) ---- */

  /** Clicking the checkbox on a pending task */
  onComplete?: (task: Task) => void;
  /** Pencil-icon edit — pass `canEdit` to control visibility */
  onEdit?: (task: Task) => void;
  /** Clicking a completed task row to see details */
  onViewCompleted?: (task: Task) => void;
  /** Return true if the current user may edit this task */
  canEdit?: (task: Task) => boolean;

  /* ---- display customisation ---- */

  /** Buttons rendered in the header row (right side) */
  headerActions?: ReactNode;
  /** When provided the counts appear next to each tab label */
  tabCounts?: { all?: number; pending?: number; completed?: number };
  /** Extra label rendered before the assignee — e.g. household name */
  getSubtitle?: (task: Task) => string | null;
  /** Custom "nothing here" message for the "all" tab */
  emptyMessage?: string;
};

/* ================================================================== */
/*  TaskListPanel                                                      */
/* ================================================================== */

export default function TaskListPanel({
  title,
  tasks,
  loading,
  currentUserId,
  onComplete,
  onEdit,
  onViewCompleted,
  canEdit,
  headerActions,
  tabCounts,
  getSubtitle,
  emptyMessage = 'No tasks yet.',
}: Props) {
  const [activeTab, setActiveTab] = useState('all');

  /* derived counts (used for tab labels when tabCounts is given) */
  const allCount = tabCounts?.all;
  const pendingCount = tabCounts?.pending;
  const completedCount = tabCounts?.completed;

  const MAX_VISIBLE = 5;

  const filteredTasks = useMemo(() => {
    let list: Task[];
    if (activeTab === 'pending') list = tasks.filter((t) => !isTaskCompleted(t));
    else if (activeTab === 'completed') list = tasks.filter((t) => isTaskCompleted(t));
    else list = tasks;
    return [...list].sort(compareTasksByUrgency).slice(0, MAX_VISIBLE);
  }, [tasks, activeTab]);

  return (
    <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
      {/* ---- Header ---- */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
        <h2 className="text-xl font-semibold text-sage">{title}</h2>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'completed'] as const).map((tab) => {
          const count =
            tab === 'all' ? allCount : tab === 'pending' ? pendingCount : completedCount;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-soft-highlight text-text-primary'
                  : 'text-text-secondary hover:bg-base'
              }`}
              type="button"
            >
              {tab}
              {count !== undefined && !loading ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* ---- Task list ---- */}
      {loading ? (
        <div className="text-text-secondary text-sm py-4">Loading tasks…</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-text-secondary text-sm py-4">
          {activeTab === 'all' ? emptyMessage : `No ${activeTab} tasks.`}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onComplete={onComplete}
              onEdit={onEdit}
              onViewCompleted={onViewCompleted}
              canEdit={canEdit}
              getSubtitle={getSubtitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TaskRow — a single row inside the list                             */
/* ================================================================== */

function TaskRow({
  task,
  currentUserId,
  onComplete,
  onEdit,
  onViewCompleted,
  canEdit,
  getSubtitle,
}: {
  task: Task;
  currentUserId?: string;
  onComplete?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onViewCompleted?: (task: Task) => void;
  canEdit?: (task: Task) => boolean;
  getSubtitle?: (task: Task) => string | null;
}) {
  const done = isTaskCompleted(task);
  const assignee = task.assignments[0]?.user;
  const priority = task.priority || 'medium';
  const completion = task.completions[0];
  const subtitle = getSubtitle?.(task);

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm ${
        done && onViewCompleted ? 'cursor-pointer' : ''
      }`}
      onClick={() => {
        if (done && onViewCompleted) onViewCompleted(task);
      }}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!done && onComplete) onComplete(task);
        }}
        className={`w-6 h-6 rounded flex-shrink-0 mt-0.5 border-2 transition-all flex items-center justify-center ${
          done
            ? 'bg-success border-success text-white cursor-default'
            : onComplete
              ? 'border-divider hover:border-sage cursor-pointer'
              : 'border-divider'
        }`}
      >
        {done && <span className="text-base leading-none">&#10003;</span>}
      </div>

      <div className="flex-1">
        {/* Title + priority + edit */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`font-semibold flex-1 ${done ? 'line-through text-text-secondary' : ''}`}
          >
            {task.title}
          </span>

          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${priorityStyles[priority]}`}
          >
            {priorityLabels[priority]}
          </span>

          {!done && onEdit && canEdit?.(task) && (
            <div className="flex gap-1 ml-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1.5 rounded text-text-secondary hover:text-sage hover:bg-sage/10 transition"
                title="Edit task"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 text-[13px] text-text-secondary flex-wrap">
          {/* Optional subtitle (e.g. household name) */}
          {subtitle && (
            <>
              <span className="font-medium text-sage/80">{subtitle}</span>
              <span>&bull;</span>
            </>
          )}

          {/* Assignee */}
          <div className="flex items-center gap-1">
            {assignee ? (
              <>
                <Avatar
                  src={assignee.avatar}
                  name={assignee.name}
                  userKey={assignee.id}
                  size="xs"
                />
                <span>
                  {assignee.id === currentUserId ? 'You' : assignee.name}
                </span>
              </>
            ) : (
              <span className="text-text-secondary italic">Unassigned</span>
            )}
          </div>

          {/* Creator - who assigned the task */}
          {task.creator && task.creator.id !== assignee?.id && (
            <>
              <span>&bull;</span>
              <span className="text-[11px] text-text-secondary">
                by {task.creator.id === currentUserId ? 'you' : task.creator.name}
              </span>
            </>
          )}

          <span>&bull;</span>
          <span>
            {done
              ? `Completed ${
                  completion?.completedAt
                    ? new Date(completion.completedAt).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric' },
                      )
                    : ''
                }`
              : `Due: ${formatDueDate(task.dueDate)}`}
          </span>

          {task.isRecurring && task.recurrencePattern && (
            <>
              <span>&bull;</span>
              <span className="capitalize">{task.recurrencePattern}</span>
            </>
          )}

          {done && completion?.photoUrl && (
            <>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-sage">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Photo
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

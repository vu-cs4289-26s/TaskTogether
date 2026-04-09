"use client";

import { CheckCircle2, Pencil, Calendar, RotateCw } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Task } from "@/types/tasks";
import {
  priorityStyles,
  priorityLabels,
  formatDueDate,
  isTaskCompleted,
} from "@/lib/task-helpers";

type TaskCardProps = {
  task: Task;
  accentColor: string;
  showCreator?: boolean;
  onComplete: () => void;
  onEdit: () => void;
};

export default function TaskCard({
  task,
  accentColor,
  showCreator = false,
  onComplete,
  onEdit,
}: TaskCardProps) {
  const completed = isTaskCompleted(task);
  const creator = task.creator;

  return (
    <div
      className={`group relative bg-surface rounded-sm shadow-sm border-l-[3px] p-3.5 transition hover:shadow-md ${
        completed ? "opacity-50" : ""
      }`}
      style={{ borderLeftColor: accentColor }}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span
          className={`flex-1 text-sm font-medium leading-snug ${
            completed
              ? "line-through text-text-secondary"
              : "text-text-primary"
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
              priorityStyles[task.priority] ?? ""
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
          <span
            className="text-[11px] text-info flex items-center gap-0.5"
            title="Recurring"
          >
            <RotateCw size={10} />
            {task.recurrencePattern}
          </span>
        )}
      </div>

      {/* Creator info */}
      {showCreator && creator && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-divider/50">
          <Avatar
            src={creator.avatar}
            name={creator.name}
            userKey={creator.id}
            size="xs"
          />
          <span className="text-[11px] text-text-secondary">
            Assigned by {creator.name}
          </span>
        </div>
      )}

      {task.description && (
        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}

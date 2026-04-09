"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import TaskCard from "./TaskCard";
import type { Task } from "@/types/tasks";
import { isTaskCompleted, compareTasksByUrgency } from "@/lib/task-helpers";

const MAX_COMPLETED_VISIBLE = 3;

type TaskLaneProps = {
  memberAvatar?: string | null;
  memberId: string;
  memberName: string;
  tasks: Task[];
  color: { bg: string; accent: string; border: string };
  showCreatorOnCards?: boolean;
  onAddTask: () => void;
  onCompleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
};

export default function TaskLane({
  memberAvatar,
  memberId,
  memberName,
  tasks,
  color,
  showCreatorOnCards = false,
  onAddTask,
  onCompleteTask,
  onEditTask,
}: TaskLaneProps) {
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
          src={memberAvatar}
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
            {pending.length} task{pending.length !== 1 ? "s" : ""} open
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
            showCreator={showCreatorOnCards}
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
            showCreator={showCreatorOnCards}
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
              ? "Show less"
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

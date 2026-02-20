'use client';

import { useEffect, useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/types/households';
import { listHouseholdsApi } from '@/lib/households.api';
import { listTasksApi } from '@/lib/tasks.api';
import type { Task } from '@/types/tasks';
import type { Household } from '@/types/households';

const priorityStyles: Record<string, string> = {
  high: 'bg-urgent/10 text-urgent border border-urgent',
  medium: 'bg-pending/10 text-pending border border-pending',
  low: 'bg-success/10 text-success border border-success',
};

const priorityLabels: Record<string, string> = { high: 'P1', medium: 'P2', low: 'P3' };

// Static calendar data
const calendarDays = [
  { day: 26, other: true }, { day: 27, other: true }, { day: 28, other: true },
  { day: 29, other: true }, { day: 30, other: true }, { day: 31, other: true },
  { day: 1, events: ['household'] },
  { day: 2 }, { day: 3 },
  { day: 4, today: true, events: ['personal'] },
  { day: 5, events: ['personal'] },
  { day: 6, events: ['personal', 'household'] },
  { day: 7, events: ['personal'] }, { day: 8 },
  { day: 9 }, { day: 10, events: ['household'] }, { day: 11 }, { day: 12 }, { day: 13 },
  { day: 14, events: ['personal'] }, { day: 15, events: ['personal'] },
  { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 },
  { day: 21 }, { day: 22 },
  { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
  { day: 28 }, { day: 1, other: true },
];

const eventDotColors: Record<string, string> = {
  personal: 'bg-sage',
  household: 'bg-terracotta',
};

interface TaskWithHousehold extends Task {
  householdName: string;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [households, setHouseholds] = useState<Household[]>([]);
  const [myTasks, setMyTasks] = useState<TaskWithHousehold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        setLoading(true);
        const hh = await listHouseholdsApi();
        setHouseholds(hh);

        // Fetch tasks assigned to me from each household
        const allTasks: TaskWithHousehold[] = [];
        await Promise.all(
          hh.map(async (h) => {
            try {
              const { tasks } = await listTasksApi(h.id, { assignedToMe: true, limit: 50 });
              tasks.forEach((t) => allTasks.push({ ...t, householdName: h.name }));
            } catch {
              // Skip households where task fetch fails
            }
          })
        );

        // Sort by due date, tasks without due date at the end
        allTasks.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        setMyTasks(allTasks);
      } catch {
        // Error loading data
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const activeTasks = myTasks.filter(
    (t) => t.completions.length === 0 && !t.assignments.some((a) => a.status === 'COMPLETED')
  );
  const completedTasks = myTasks.filter(
    (t) => t.completions.length > 0 || t.assignments.some((a) => a.status === 'COMPLETED')
  );

  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';
  const userInitials = user ? getInitials(user.name) : '?';

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      {/* Profile Header */}
      <div className="bg-surface border-b border-divider px-6 py-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-sage text-white flex items-center justify-center text-4xl font-bold border-4 border-divider flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1">
            <h1 className="text-[32px] font-heading font-bold mb-1">{userName}</h1>
            <p className="text-text-secondary text-sm mb-3">{userEmail}</p>
            <div className="flex gap-6 mt-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{loading ? '-' : activeTasks.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Active Tasks</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{loading ? '-' : households.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Households</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">{loading ? '-' : completedTasks.length}</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Completed</span>
              </div>
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">My Tasks</h2>
          </div>

          {loading ? (
            <div className="text-text-secondary text-sm py-4">Loading tasks...</div>
          ) : activeTasks.length === 0 ? (
            <div className="text-text-secondary text-sm py-4">No active tasks assigned to you.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeTasks.map((task) => {
                const priority = task.priority || 'medium';
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm"
                  >
                    <div className="w-6 h-6 rounded border-2 border-divider flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold flex-1">{task.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${priorityStyles[priority]}`}>
                          {priorityLabels[priority]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] text-text-secondary">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-soft-highlight text-text-primary">
                          {task.householdName}
                        </span>
                        <span>&bull;</span>
                        <span>
                          {task.dueDate
                            ? `Due: ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'No due date'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Calendar (static) */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">My Calendar</h2>
            <button className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Event
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-base">February 2026</span>
            <div className="flex gap-2">
              <button className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all">&larr;</button>
              <button className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all">&rarr;</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-text-secondary py-2">{d}</div>
            ))}
            {calendarDays.map((d, i) => (
              <div
                key={i}
                className={`aspect-square border rounded p-1 text-sm cursor-pointer transition-all ${
                  d.today
                    ? 'bg-sage text-white font-semibold border-sage'
                    : d.other
                    ? 'border-divider text-text-secondary opacity-40 bg-surface'
                    : 'border-divider bg-surface hover:border-sage hover:bg-soft-highlight'
                }`}
              >
                {d.day}
                {d.events && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {d.events.map((e, j) => (
                      <div key={j} className={`w-1.5 h-1.5 rounded-full ${eventDotColors[e]}`} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-[13px]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-sage" />
              <span>My Tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-terracotta" />
              <span>Household Events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

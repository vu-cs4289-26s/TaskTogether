// src/app/households/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { getHousehold } from '@/lib/households';
import { listTasksApi, createTaskApi, completeTaskApi } from '@/lib/tasks.api';
import type { Household } from '@/types/households';
import { getInitials, getAvatarColor } from '@/types/households';
import type { Task, CreateTaskInput } from '@/types/tasks';
import AddTaskModal from '@/components/households/AddTaskModal';
import ManageMembersModal from '@/components/households/ManageMembersModal';
import { useAuth } from '@/contexts/AuthContext';

//report issue feature 
import IssuesSection from '@/components/issues/IssueSection';

const priorityStyles: Record<string, string> = {
    high: 'bg-urgent/10 text-urgent border border-urgent',
    medium: 'bg-pending/10 text-pending border border-pending',
    low: 'bg-success/10 text-success border border-success',
};

const priorityLabels: Record<string, string> = { high: 'P1', medium: 'P2', low: 'P3' };

const issueBorderColors: Record<string, string> = {
    high: 'border-l-urgent',
    medium: 'border-l-pending',
    low: 'border-l-info',
};

const priorityTextColors: Record<string, string> = {
    high: 'text-urgent',
    medium: 'text-pending',
    low: 'text-success',
};

// Static issues data (no backend yet)
// const issues = [
//     {
//         id: '1',
//         title: 'Broken dishwasher - not draining',
//         reporter: 'Sarah',
//         time: 'Feb 3, 2:45 PM',
//         priority: 'high',
//         type: 'Maintenance',
//     },
//     {
//         id: '2',
//         title: 'Noise levels after 11 PM',
//         reporter: 'Michael',
//         time: 'Feb 2, 8:20 AM',
//         priority: 'medium',
//         type: 'Conflict',
//     },
//     {
//         id: '3',
//         title: 'Kitchen light bulb needs replacing',
//         reporter: 'You',
//         time: 'Feb 1, 6:15 PM',
//         priority: 'low',
//         type: 'Maintenance',
//     },
// ];

// Static calendar data
const calendarDays = [
    { day: 26, other: true }, { day: 27, other: true }, { day: 28, other: true },
    { day: 29, other: true }, { day: 30, other: true }, { day: 31, other: true },
    { day: 1, events: ['shared'] }, { day: 2 }, { day: 3, events: ['chore'] },
    { day: 4, today: true, events: ['personal'] }, { day: 5, events: ['chore'] },
    { day: 6, events: ['chore', 'shared'] }, { day: 7 }, { day: 8, events: ['shared'] },
    { day: 9 }, { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 },
    { day: 14, events: ['personal'] }, { day: 15 }, { day: 16 }, { day: 17 },
    { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 },
    { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
    { day: 28 }, { day: 1, other: true },
];

const eventDotColors: Record<string, string> = {
    chore: 'bg-sage',
    shared: 'bg-terracotta',
    personal: 'bg-info',
};

function formatDueDate(dateStr: string | null): string {
    if (!dateStr) return 'No due date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isTaskCompleted(task: Task): boolean {
    return task.completions.length > 0 ||
        task.assignments.some((a) => a.status === 'COMPLETED');
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

    //added report issue modal state
    const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
    const [issueError, setIssueError] = useState<string | null>(null);

    // Manage members modal state
    const [isMembersOpen, setIsMembersOpen] = useState(false);

    // Completing task state
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

    const fetchHousehold = useCallback(async () => {
        if (!id) return;
        try {
            const data = await getHousehold(id);
            if (data) setHousehold(data);
        } catch {
            // Non-critical for refresh
        }
    }, [id]);

    const fetchTasks = useCallback(async () => {
        if (!id) return;
        try {
            setTasksLoading(true);
            const { tasks: data } = await listTasksApi(id, { limit: 50 });
            setTasks(data);
        } catch {
            // Tasks loading failure is non-critical
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

        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

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

    async function handleCompleteTask(taskId: string) {
        if (!id) return;
        try {
            setCompletingTaskId(taskId);
            await completeTaskApi(id, taskId);
            await fetchTasks();
        } catch {
            // Could show error toast
        } finally {
            setCompletingTaskId(null);
        }
    }

    function handleMembersChanged() {
        fetchHousehold();
    }

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

                            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                            <span>&bull;</span>
                            <span>{isAdmin ? "You're Admin" : 'Member'}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-4 flex-wrap">
                        <button
                            onClick={() => setIsMembersOpen(true)}
                            className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
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
                <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
                        <h2 className="text-xl font-semibold text-sage">Household Chores</h2>
                        <button
                            onClick={() => setIsAddTaskOpen(true)}
                            className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
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
                                className={`px-4 py-2 rounded-sm text-sm font-medium transition-all capitalize ${activeTab === tab
                                    ? 'bg-soft-highlight text-text-primary'
                                    : 'text-text-secondary hover:bg-base'
                                    }`}
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
                                const isCompleting = completingTaskId === task.id;

                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm"
                                    >
                                        <div
                                            onClick={() => {
                                                if (!done && !isCompleting) handleCompleteTask(task.id);
                                            }}
                                            className={`w-6 h-6 rounded flex-shrink-0 mt-0.5 border-2 transition-all flex items-center justify-center ${done
                                                ? 'bg-success border-success text-white cursor-default'
                                                : isCompleting
                                                    ? 'border-sage animate-pulse cursor-wait'
                                                    : 'border-divider hover:border-sage cursor-pointer'
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

                {/* Shared Calendar (static) */}
                <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
                        <h2 className="text-xl font-semibold text-sage">Shared Calendar</h2>
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
                                className={`aspect-square border rounded p-1 text-sm cursor-pointer transition-all ${d.today
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
                            <span>Chores</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-terracotta" />
                            <span>Shared Space</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-info" />
                            <span>Group Activity</span>
                        </div>
                    </div>
                </div>

                {/* Report Issues - Full Width (static)*/}


                <IssuesSection householdId={id || ''} isAdmin={isAdmin} />


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

                {user && (
                    <ManageMembersModal
                        open={isMembersOpen}
                        householdId={id || ''}
                        members={members}
                        myRole={household.myRole}
                        currentUserId={user.id}
                        onClose={() => setIsMembersOpen(false)}
                        onMembersChanged={handleMembersChanged}
                    />
                )}
            </div>
        </div>);
}
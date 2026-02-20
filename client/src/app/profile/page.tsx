'use client';

import AppNavbar from '@/components/shared/AppNavbar';

const tasks = [
  { id: '1', title: 'Vacuum living room', household: 'Main St Apt', due: 'Feb 6', priority: 'high' },
  { id: '2', title: 'Water plants', household: 'Main St Apt', due: 'Feb 7', priority: 'low' },
  { id: '3', title: 'Organize storage closet', household: 'Beach House', due: 'Feb 10', priority: 'medium' },
  { id: '4', title: 'Clean kitchen counters', household: 'Campus Dorm', due: 'Feb 5', priority: 'high' },
  { id: '5', title: 'Replace air filter', household: 'Main St Apt', due: 'Feb 15', priority: 'low' },
];

const priorityStyles: Record<string, string> = {
  high: 'bg-urgent/10 text-urgent border border-urgent',
  medium: 'bg-pending/10 text-pending border border-pending',
  low: 'bg-success/10 text-success border border-success',
};

const priorityLabels: Record<string, string> = { high: 'P1', medium: 'P2', low: 'P3' };

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

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      {/* Profile Header */}
      <div className="bg-surface border-b border-divider px-6 py-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-sage text-white flex items-center justify-center text-4xl font-bold border-4 border-divider flex-shrink-0">
            JD
          </div>
          <div className="flex-1">
            <h1 className="text-[32px] font-heading font-bold mb-1">Jordan Davis</h1>
            <p className="text-text-secondary text-sm mb-3">jordan.davis@email.com</p>
            <div className="flex gap-6 mt-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">12</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Active Tasks</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">3</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">Households</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">48</span>
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
            <button className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Task
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm"
              >
                <div className="w-6 h-6 rounded border-2 border-divider cursor-pointer flex-shrink-0 mt-0.5 hover:border-sage transition-all" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold flex-1">{task.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${priorityStyles[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px] text-text-secondary">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-soft-highlight text-text-primary">
                      {task.household}
                    </span>
                    <span>&bull;</span>
                    <span>Due: {task.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Calendar */}
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

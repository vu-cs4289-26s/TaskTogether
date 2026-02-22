'use client';

import AppNavbar from '@/components/shared/AppNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Plus } from 'lucide-react';

type CalendarEventType = 'personal' | 'household';

type CalendarDay = {
  day: number;
  other?: boolean;
  today?: boolean;
  events?: CalendarEventType[];
};

const calendarDays: CalendarDay[] = [
  { day: 26, other: true },
  { day: 27, other: true },
  { day: 28, other: true },
  { day: 29, other: true },
  { day: 30, other: true },
  { day: 31, other: true },
  { day: 1, events: ['household'] },
  { day: 2 },
  { day: 3 },
  { day: 4, today: true, events: ['personal'] },
  { day: 5, events: ['personal'] },
  { day: 6, events: ['personal', 'household'] },
  { day: 7, events: ['personal'] },
  { day: 8 },
  { day: 9 },
  { day: 10, events: ['household'] },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14, events: ['personal'] },
  { day: 15, events: ['personal'] },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22 },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28 },
  { day: 1, other: true },
];
const eventDotColors: Record<string, string> = {
  personal: 'bg-sage',
  household: 'bg-terracotta',
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const error = !loading && !user ? 'Not logged in' : null;

  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join('') ?? '??';

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="bg-surface border-b border-divider px-6 py-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-sage text-white flex items-center justify-center text-4xl font-bold border-4 border-divider flex-shrink-0">
            {loading ? '…' : initials}
          </div>

          <div className="flex-1">
            <h1 className="text-[32px] font-heading font-bold mb-1">
              {loading ? 'Loading…' : user?.name ?? 'Unknown User'}
            </h1>

            <p className="text-text-secondary text-sm mb-3">
              {loading ? '' : user?.email ?? ''}
            </p>

            {error && (
              <div className="mt-2 inline-block px-3 py-2 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-6 mt-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">0</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">
                  Active Tasks
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">0</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">
                  Households
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-sage">0</span>
                <span className="text-[13px] text-text-secondary uppercase tracking-wide">
                  Completed
                </span>
              </div>
            </div>
          </div>

          <button
            className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage disabled:opacity-60"
            disabled={loading || !!error}
            type="button"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">My Tasks</h2>
            <button
              className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
              type="button"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          <div className="text-text-secondary text-sm">
            No chores yet. Create your first household to start adding chores.
          </div>
        </div>

        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">My Calendar</h2>
            <button
              className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
              type="button"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-base">February 2026</span>
            <div className="flex gap-2">
              <button
                className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all"
                type="button"
                aria-label="Previous month"
              >
                &larr;
              </button>
              <button
                className="w-8 h-8 border border-divider bg-transparent rounded text-text-primary hover:bg-soft-highlight hover:border-sage transition-all"
                type="button"
                aria-label="Next month"
              >
                &rarr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-text-secondary py-2"
              >
                {d}
              </div>
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
                {'events' in d && d.events && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {d.events.map((e, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${eventDotColors[e]}`}
                      />
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
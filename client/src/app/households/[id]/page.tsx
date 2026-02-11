'use client';

import { useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';

const chores = [
  { id: '1', title: 'Vacuum living room', assignee: 'Sarah', initials: 'SC', due: 'Feb 6', recurrence: 'Weekly', priority: 'high', completed: false },
  { id: '2', title: 'Take out trash and recycling', assignee: 'Michael', initials: 'MK', due: 'Feb 5', recurrence: 'Weekly', priority: 'medium', completed: false },
  { id: '3', title: 'Clean bathroom', assignee: 'Alex', initials: 'AL', due: 'Completed Feb 3', recurrence: '', priority: 'low', completed: true },
  { id: '4', title: 'Water plants', assignee: 'You', initials: 'JD', due: 'Feb 7', recurrence: 'Bi-weekly', priority: 'low', completed: false },
];

const issues = [
  { id: '1', title: 'Broken dishwasher - not draining', reporter: 'Sarah', time: 'Feb 3, 2:45 PM', priority: 'high', type: 'Maintenance' },
  { id: '2', title: 'Noise levels after 11 PM', reporter: 'Michael', time: 'Feb 2, 8:20 AM', priority: 'medium', type: 'Conflict' },
  { id: '3', title: 'Kitchen light bulb needs replacing', reporter: 'You', time: 'Feb 1, 6:15 PM', priority: 'low', type: 'Maintenance' },
];

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

const calendarDays = [
  { day: 26, other: true }, { day: 27, other: true }, { day: 28, other: true },
  { day: 29, other: true }, { day: 30, other: true }, { day: 31, other: true },
  { day: 1, events: ['shared'] },
  { day: 2 }, { day: 3, events: ['chore'] },
  { day: 4, today: true, events: ['personal'] },
  { day: 5, events: ['chore'] },
  { day: 6, events: ['chore', 'shared'] },
  { day: 7 }, { day: 8, events: ['shared'] },
  { day: 9 }, { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 },
  { day: 14, events: ['personal'] }, { day: 15 },
  { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 },
  { day: 21 }, { day: 22 },
  { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
  { day: 28 }, { day: 1, other: true },
];

const eventDotColors: Record<string, string> = {
  chore: 'bg-sage',
  shared: 'bg-terracotta',
  personal: 'bg-info',
};

export default function HouseholdDashboard() {
  const [activeTab, setActiveTab] = useState('all');
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(chores.filter((c) => c.completed).map((c) => c.id))
  );

  const toggleChore = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredChores = chores.filter((c) => {
    if (activeTab === 'pending') return !completedIds.has(c.id);
    if (activeTab === 'completed') return completedIds.has(c.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      {/* Dashboard Header */}
      <div className="bg-gradient-to-br from-soft-highlight to-surface border-b border-divider px-6 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-4">
            <h1 className="text-[32px] font-heading font-bold mb-2">Main Street Apartment</h1>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <div className="flex gap-1">
                {[
                  { i: 'JD', c: 'bg-[#5A7C5E]' },
                  { i: 'SC', c: 'bg-[#B85C4A]' },
                  { i: 'MK', c: 'bg-[#4A7C5A]' },
                  { i: 'AL', c: 'bg-[#C49347]' },
                ].map((m, idx) => (
                  <div key={idx} className={`w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-xs font-semibold text-white ${m.c}`}>
                    {m.i}
                  </div>
                ))}
              </div>
              <span>4 members</span>
              <span>&bull;</span>
              <span>You&apos;re Admin</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </button>
            <button className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage">
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

      {/* Dashboard Content */}
      <div className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chore List */}
        <div className="bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Household Chores</h2>
            <button className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px">
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
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-soft-highlight text-text-primary'
                    : 'text-text-secondary hover:bg-base'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {filteredChores.map((chore) => {
              const done = completedIds.has(chore.id);
              return (
                <div
                  key={chore.id}
                  className="flex items-start gap-4 p-4 rounded-sm border border-divider transition-all hover:border-sage hover:shadow-sm"
                >
                  <div
                    onClick={() => toggleChore(chore.id)}
                    className={`w-6 h-6 rounded flex-shrink-0 mt-0.5 cursor-pointer border-2 transition-all flex items-center justify-center ${
                      done
                        ? 'bg-success border-success text-white'
                        : 'border-divider hover:border-sage'
                    }`}
                  >
                    {done && <span className="text-base leading-none">&#10003;</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold flex-1 ${done ? 'line-through text-text-secondary' : ''}`}>
                        {chore.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${priorityStyles[chore.priority]}`}>
                        {priorityLabels[chore.priority]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-text-secondary">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-sage text-white text-[10px] flex items-center justify-center">
                          {chore.initials}
                        </div>
                        <span>{chore.assignee}</span>
                      </div>
                      <span>&bull;</span>
                      <span>{done ? chore.due : `Due: ${chore.due}`}</span>
                      {chore.recurrence && (
                        <>
                          <span>&bull;</span>
                          <span>{chore.recurrence}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shared Calendar */}
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

        {/* Report Issues - Full Width */}
        <div className="lg:col-span-2 bg-surface rounded-md p-6 shadow-sm border border-divider">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
            <h2 className="text-xl font-semibold text-sage">Report Issues</h2>
            <button className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Report Issue
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 border-l-4 rounded-sm bg-base ${issueBorderColors[issue.priority]}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold">{issue.title}</span>
                  <span
                    className={`px-2 py-1 rounded text-[11px] font-semibold uppercase border ${
                      issue.type === 'Conflict'
                        ? 'bg-urgent/10 text-urgent border-urgent'
                        : 'bg-sage/10 text-sage border-sage'
                    }`}
                  >
                    {issue.type}
                  </span>
                </div>
                <div className="flex gap-4 text-[13px] text-text-secondary">
                  <span>Reported by {issue.reporter}</span>
                  <span>&bull;</span>
                  <span>{issue.time}</span>
                  <span>&bull;</span>
                  <span className={`font-semibold capitalize ${priorityTextColors[issue.priority]}`}>
                    {issue.priority} Priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

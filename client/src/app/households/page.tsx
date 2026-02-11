'use client';

import AppNavbar from '@/components/shared/AppNavbar';

const households = [
  {
    id: '1',
    name: 'Main Street Apartment',
    memberCount: 4,
    isAdmin: true,
    members: [
      { initials: 'JD', color: 'bg-[#5A7C5E]' },
      { initials: 'SC', color: 'bg-[#B85C4A]' },
      { initials: 'MK', color: 'bg-[#4A7C5A]' },
      { initials: 'AL', color: 'bg-[#C49347]' },
    ],
    stats: { activeChores: 8, openIssues: 3, thisMonth: 12 },
  },
  {
    id: '2',
    name: 'Beach House',
    memberCount: 6,
    isAdmin: false,
    members: [
      { initials: 'JD', color: 'bg-[#5A7C5E]' },
      { initials: 'EM', color: 'bg-[#B85C4A]' },
      { initials: 'RD', color: 'bg-[#4A7C5A]' },
      { initials: 'LM', color: 'bg-[#C49347]' },
      { initials: 'KP', color: 'bg-[#6E6E70]' },
    ],
    stats: { activeChores: 3, openIssues: 0, thisMonth: 5 },
  },
  {
    id: '3',
    name: 'Campus Dorm Suite',
    memberCount: 2,
    isAdmin: true,
    members: [
      { initials: 'JD', color: 'bg-[#5A7C5E]' },
      { initials: 'TW', color: 'bg-[#C94E4E]' },
    ],
    stats: { activeChores: 5, openIssues: 1, thisMonth: 18 },
  },
];

export default function HouseholdsPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="max-w-[900px] mx-auto px-6 pt-12 pb-8 text-center">
        <h1 className="text-[32px] font-heading font-bold mb-4">My Households</h1>
        <p className="text-text-secondary text-lg">Manage all your households in one place</p>
      </div>

      <div className="max-w-[900px] mx-auto px-6 pb-12">
        <div className="flex justify-end mb-6">
          <button className="px-6 py-3 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Household
          </button>
        </div>

        <div className="grid gap-6">
          {households.map((h) => (
            <a
              key={h.id}
              href={`/households/${h.id}`}
              className="block bg-surface rounded-md p-8 shadow-sm border border-divider transition-all hover:-translate-y-1 hover:shadow-md hover:border-sage cursor-pointer no-underline"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-heading font-semibold text-sage mb-1">{h.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                    <span>{h.memberCount} members</span>
                    {h.isAdmin && (
                      <>
                        <span>&bull;</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-sage/10 text-sage border border-sage">
                          Admin
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {h.members.map((m, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-xs font-semibold text-white ${m.color}`}
                      >
                        {m.initials}
                      </div>
                    ))}
                    {h.memberCount > h.members.length && (
                      <div className="w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-xs font-semibold bg-divider text-text-primary">
                        +{h.memberCount - h.members.length}
                      </div>
                    )}
                  </div>
                </div>
                <svg
                  className="w-6 h-6 text-text-secondary transition-all group-hover:text-sage"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <div className="flex gap-8 pt-4 border-t border-divider">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-text-primary">{h.stats.activeChores}</span>
                  <span className="text-xs text-text-secondary uppercase tracking-wide">Active Chores</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-text-primary">{h.stats.openIssues}</span>
                  <span className="text-xs text-text-secondary uppercase tracking-wide">Open Issues</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-text-primary">{h.stats.thisMonth}</span>
                  <span className="text-xs text-text-secondary uppercase tracking-wide">This Month</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

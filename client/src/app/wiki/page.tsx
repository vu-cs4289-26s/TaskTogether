'use client';

import { useEffect, useMemo, useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';

type SectionId =
    | 'garbage'
    | 'appliances'
    | 'bills'
    | 'weather'
    | 'parking'
    | 'rules'
    | 'misc';

const CONTENTS: { id: SectionId; title: string }[] = [
    { id: 'garbage', title: 'Garbage & Recycling' },
    { id: 'appliances', title: 'Appliances' },
    { id: 'bills', title: 'Bills & Subscriptions' },
    { id: 'weather', title: 'Weather & Seasonal' },
    { id: 'parking', title: 'Parking & Storage' },
    { id: 'rules', title: 'Rules & Expectations' },
    { id: 'misc', title: 'Miscellaneous' },
];

export default function WikiPage() {
    const [active, setActive] = useState<SectionId>('garbage');

    const sectionIds = useMemo(() => CONTENTS.map((c) => c.id), []);

   useEffect(() => {
  function onScroll() {
    const eyeY = window.innerHeight * 0.35;

    const bottomSlack = 8;
    const scrolledToBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - bottomSlack;

    if (scrolledToBottom) {
      setActive(sectionIds[sectionIds.length - 1] as SectionId);
      return;
    }

    let best: { id: SectionId; dist: number } | null = null;

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;

      const top = el.getBoundingClientRect().top;
      const dist = eyeY - top;

      if (dist >= 0 && (best === null || dist < best.dist)) {
        best = { id: id as SectionId, dist };
      }
    }

    setActive(best?.id ?? (sectionIds[0] as SectionId));
  }

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [sectionIds]);

    function scrollTo(id: SectionId) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        <div className="min-h-screen bg-base">
            <AppNavbar />

            <div className="bg-surface border-b border-divider">
                <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-[32px] font-heading font-bold text-text-primary">
                            Household Wiki
                        </h1>
                        <p className="mt-1 text-sm text-text-secondary">
                            Main Street Apartment
                            <span className="ml-2 inline-block px-2 py-1 rounded text-[11px] font-semibold uppercase bg-sage/10 text-sage border border-sage">
                                Admin
                            </span>
                        </p>
                    </div>

                    <button
                        type="button"
                        className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                        onClick={() => { }}
                        title="Edit mode will be wired up later"
                    >
                        <svg
                            className="w-4 h-4"
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
                        Edit Wiki
                    </button>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
                <aside className="lg:sticky lg:top-[120px] h-fit">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-4">
                        Contents
                    </div>

                    <nav className="flex flex-col gap-1">
                        {CONTENTS.map((item) => {
                            const isActive = active === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => scrollTo(item.id)}
                                    className={[
                                        'text-left px-4 py-2 rounded-sm text-sm font-medium transition border-l-4',
                                        isActive
                                            ? 'bg-soft-highlight text-sage font-semibold border-sage'
                                            : 'text-text-secondary border-transparent hover:bg-soft-highlight hover:text-sage hover:border-terracotta',
                                    ].join(' ')}
                                >
                                    {item.title}
                                </button>
                            );
                        })}
                    </nav>
                </aside>
                <main className="min-w-0 space-y-6">
                    <section
                        id="garbage"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Garbage & Recycling" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Trash Pickup" value="Mondays & Thursdays, 7:00 AM" />
                            <InfoItem label="Recycling Pickup" value="Wednesdays, 7:00 AM" />
                            <InfoItem label="Bin Location" value="Side alley, must be out by 6:30 AM" />
                            <InfoItem label="Special Items" value="Call 555-WASTE for bulk pickup scheduling" />
                        </div>

                        <LastUpdated text="Last updated by Sarah Chen on Feb 1, 2026" />
                    </section>

                    <section
                        id="appliances"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Appliance Maintenance" />

                        <div className="divide-y divide-divider">
                            <ListItem
                                left={
                                    <>
                                        <div className="font-semibold text-text-primary">
                                            Dishwasher <span className="font-normal">- GE Model GDT695SSJSS</span>
                                        </div>
                                        <div className="text-[13px] text-text-secondary">
                                            Included with apartment
                                        </div>
                                    </>
                                }
                                right={<span className="text-[13px] text-text-secondary">Maintenance: 555-HOME-FIX</span>}
                            />
                            <ListItem
                                left={
                                    <>
                                        <div className="font-semibold text-text-primary">
                                            Washer/Dryer <span className="font-normal">- Samsung WF45R6100AW</span>
                                        </div>
                                        <div className="text-[13px] text-text-secondary">
                                            Included with apartment
                                        </div>
                                    </>
                                }
                                right={<span className="text-[13px] text-text-secondary">Warranty until Dec 2026</span>}
                            />
                            <ListItem
                                left={
                                    <>
                                        <div className="font-semibold text-text-primary">
                                            Refrigerator <span className="font-normal">- Whirlpool WRF535SWHZ</span>
                                        </div>
                                        <div className="text-[13px] text-text-secondary">
                                            Owned by landlord
                                        </div>
                                    </>
                                }
                                right={
                                    <span className="text-[13px] text-text-secondary">
                                        Contact property manager for repairs
                                    </span>
                                }
                            />
                            <ListItem
                                left={
                                    <>
                                        <div className="font-semibold text-text-primary">Air Filter</div>
                                        <div className="text-[13px] text-text-secondary">
                                            Replace quarterly (16x25x1)
                                        </div>
                                    </>
                                }
                                right={<span className="text-[13px] text-text-secondary">Next: May 2026</span>}
                            />
                        </div>

                        <LastUpdated text="Last updated by Michael Kim on Jan 28, 2026" />
                    </section>

                    <section
                        id="bills"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <div className="flex items-start justify-between gap-6 mb-6 pb-4 border-b border-divider">
                            <h3 className="text-xl font-heading font-semibold text-sage">
                                Bills & Subscriptions
                            </h3>

                            <span className="inline-flex items-center gap-2 px-2 py-1 rounded text-[11px] font-semibold uppercase bg-pending/10 text-pending border border-pending">
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                2 Pending Changes
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Rent" value="$2,400/month - Due 1st of month" />
                            <InfoItem label="Electric (ConEd)" value="~$120/month - Split 4 ways" />
                            <InfoItem label="Internet (Spectrum)" value="$79.99/month - Split 4 ways" />
                            <InfoItem label="Streaming Services" value="Netflix, Hulu (see shared doc)" />
                        </div>

                        <div className="mt-4 p-4 rounded-sm bg-soft-highlight">
                            <div className="font-semibold text-sm text-text-primary">Package Delivery:</div>
                            <p className="mt-1 text-sm text-text-secondary">
                                Packages delivered to front lobby. Check mail room daily. Notify group chat
                                when you receive a package for someone else.
                            </p>
                        </div>

                        <LastUpdated text="Last updated by You on Feb 3, 2026" />
                    </section>

                    <section
                        id="weather"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Weather & Seasonal Info" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem
                                label="Winter (Nov-Mar)"
                                value="Snow removal required within 24 hours of snowfall. Shovels in storage closet."
                            />
                            <InfoItem
                                label="Summer (Jun-Aug)"
                                value="AC filters should be cleaned monthly. Spare filters in hall closet."
                            />
                            <InfoItem
                                label="Emergency Contacts"
                                value="Building Super: 555-0123 | Landlord: 555-4567"
                            />
                        </div>

                        <LastUpdated text="Last updated by Alex Lee on Jan 15, 2026" />
                    </section>

                    <section
                        id="parking"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Parking & Storage" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem
                                label="Assigned Parking"
                                value="Spots #12 and #13 in underground garage. Access code: 4789"
                            />
                            <InfoItem
                                label="Guest Parking"
                                value="Street parking only. 2-hour limit on weekdays."
                            />
                            <InfoItem label="Storage Unit" value="Unit B-7 in basement. Key with Sarah." />
                            <InfoItem
                                label="Bike Storage"
                                value="Bike rack outside back entrance. Bring own lock."
                            />
                        </div>

                        <LastUpdated text="Last updated by Sarah Chen on Jan 20, 2026" />
                    </section>

                    <section
                        id="rules"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Household Rules & Expectations" />

                        <div className="space-y-3 text-text-secondary leading-7">
                            <p>
                                <span className="font-semibold text-text-primary">Quiet Hours:</span> 10 PM -
                                8 AM on weekdays, 11 PM - 9 AM on weekends
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Guests:</span> Please
                                notify household 24 hours in advance for overnight guests. Maximum 2
                                consecutive nights.
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Common Areas:</span> Clean
                                up after yourself immediately. Kitchen should be clean by 10 PM daily.
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Temperature:</span> Keep
                                thermostat between 68-72°F. Adjust for comfort but be mindful of energy
                                costs.
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Shared Items:</span> Label
                                personal food items. Shared items include condiments, cooking oil, and
                                cleaning supplies.
                            </p>
                        </div>

                        <LastUpdated text="Last updated by Sarah Chen on Jan 5, 2026" />
                    </section>

                    <section
                        id="misc"
                        className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
                    >
                        <SectionHeader title="Miscellaneous Details" />

                        <div className="space-y-3 text-text-secondary leading-7">
                            <p>
                                <span className="font-semibold text-text-primary">WiFi Network:</span>{' '}
                                MainStApt_5G | Password: Welcome2026!
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Key Copies:</span>{' '}
                                Landlord has master. Spare key in lockbox (code with property manager).
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Mail:</span> Mailboxes in
                                lobby. Box #4A. Check daily to avoid overflow.
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Laundry:</span> In-unit
                                washer/dryer. Be courteous with timing if someone has clothes waiting.
                            </p>
                            <p>
                                <span className="font-semibold text-text-primary">Pet Policy:</span> No pets
                                per lease agreement.
                            </p>
                        </div>

                        <LastUpdated text="Last updated by Michael Kim on Feb 2, 2026" />
                    </section>
                </main>
            </div>
        </div>
    );
}


function SectionHeader({ title }: { title: string }) {
    return (
        <div className="mb-6 pb-4 border-b border-divider flex items-center justify-between">
            <h3 className="text-xl font-heading font-semibold text-sage">{title}</h3>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-text-primary">
                {label}
            </div>
            <div className="text-text-secondary">{value}</div>
        </div>
    );
}

function LastUpdated({ text }: { text: string }) {
    return <div className="mt-4 text-xs text-text-secondary italic">{text}</div>;
}

function ListItem({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
            <div>{left}</div>
            <div className="sm:text-right">{right}</div>
        </div>
    );
}
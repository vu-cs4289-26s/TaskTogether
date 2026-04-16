'use client';

import { useState, type ReactNode } from 'react';

interface HeroProps {
  onGetStarted: () => void;
}

type Slide = {
  id: string;
  label: string;
  content: ReactNode;
};

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[820px] overflow-hidden rounded-[28px] border border-white/45 bg-white shadow-[0_22px_60px_rgba(58,41,29,0.26)]">
      <div className="flex items-center gap-2 border-b border-[#ece3d8] bg-[#faf6f0] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#df8f82]" />
        <span className="h-3 w-3 rounded-full bg-[#e2c16f]" />
        <span className="h-3 w-3 rounded-full bg-[#8bac88]" />
        <div className="ml-auto text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f786f]">
          TaskTogether
        </div>
      </div>
      <div className="bg-[#fffdfa]">{children}</div>
    </div>
  );
}

function MockHouseholdsImage() {
  return (
    <BrowserFrame>
      <div className="space-y-6 p-6 text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[34px] font-semibold text-[#202722]">My Households</div>
            <div className="mt-1 text-sm text-[#6e746f]">Manage all your spaces in one place</div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-[#cfd8cb] px-4 py-3 text-sm font-medium text-[#5a7c5e]">
              Join Household
            </div>
            <div className="rounded-2xl bg-[#6f886a] px-4 py-3 text-sm font-medium text-white">
              New Household
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e6ddd0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-semibold text-[#5a7c5e]">Maple House</div>
              <div className="mt-2 flex items-center gap-3 text-sm text-[#6f746d]">
                <span>4 members</span>
                <span>&bull;</span>
                <span className="rounded-full border border-[#7b9a78] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#5a7c5e]">
                  Admin
                </span>
              </div>
            </div>
            <div className="text-3xl text-[#7f837f]">›</div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {['EN', 'JD', 'MK', 'AL'].map((name, index) => (
              <div
                key={name}
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-white"
                style={{
                  backgroundColor: ['#6e7d92', '#9f7d68', '#7d936f', '#9b6f82'][index],
                }}
              >
                {name}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#ece3d8] pt-4 text-sm text-[#6d736e]">
            <div>Created 4/3/2026</div>
            <div>Your role: Admin</div>
            <div>2 upcoming events</div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockDashboardImage() {
  return (
    <BrowserFrame>
      <div className="space-y-4 p-5 text-left">
        <div>
          <div className="text-[34px] font-semibold text-[#202722]">Maple House</div>
          <div className="mt-2 flex items-center gap-3 text-sm text-[#6d736e]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6f7f91] font-semibold text-white">
              EN
            </span>
            <span>4 members</span>
            <span>&bull;</span>
            <span>You&apos;re Admin</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-2xl font-semibold text-[#5a7c5e]">Tasks</div>
              <div className="rounded-2xl bg-[#6f886a] px-4 py-2 text-sm font-medium text-white">
                Add Task
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="rounded-xl bg-[#eee8df] px-3 py-2 font-medium text-[#403f3b]">All (4)</div>
              <div className="px-3 py-2 text-[#666b65]">Pending (2)</div>
              <div className="px-3 py-2 text-[#666b65]">Completed (2)</div>
            </div>
            <div className="mt-4 space-y-3">
              {['Vacuum living room', 'Take out recycling', 'Plan dinner'].map((item) => (
                <div key={item} className="rounded-xl bg-[#fbf8f2] p-3 text-sm text-[#2d312d]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-2xl font-semibold text-[#5a7c5e]">Shared Calendar</div>
              <div className="rounded-2xl border border-[#d9d2c7] px-4 py-2 text-sm font-medium text-[#4a514b]">
                Add Event
              </div>
            </div>
            <div className="text-lg font-semibold text-[#2c332d]">April 2026</div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 21 }, (_, index) => {
                const active = [5, 10, 16].includes(index);
                return (
                  <div
                    key={index}
                    className={[
                      'min-h-[74px] rounded-2xl border p-2 text-xs',
                      active ? 'border-[#73906f] bg-[#ebf4e8]' : 'border-[#ece4d9] bg-[#fffdfa]',
                    ].join(' ')}
                  >
                    <div className="font-medium text-[#5e635e]">{index + 1}</div>
                    {active && <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[#6f886a]" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-2xl font-semibold text-[#202722]">Report Issues</div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-[#d8d0c4] px-4 py-2 text-sm font-medium text-[#414541]">
                Full Reports
              </div>
              <div className="rounded-2xl bg-[#6f886a] px-4 py-2 text-sm font-medium text-white">
                + Report Issue
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e6ddd0] bg-[#fffdfa] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[#202722]">Leaky kitchen faucet</div>
                <div className="mt-2 flex items-center gap-3 text-sm text-[#6d736e]">
                  <span>Emily Nguyen</span>
                  <span>&bull;</span>
                  <span>Apr 16, 2026</span>
                </div>
              </div>
              <div className="rounded-full border border-[#d98c81] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#c06458]">
                Open
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockProfileImage() {
  return (
    <BrowserFrame>
      <div className="space-y-5 p-5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#6a7686] text-[34px] font-semibold text-white">
              EN
            </div>
            <div>
              <div className="text-[34px] font-semibold text-[#202722]">Emily Nguyen</div>
              <div className="text-sm text-[#6b726d]">emily@example.com</div>
              <div className="mt-3 flex gap-6">
                {[
                  ['8', 'Active Tasks'],
                  ['2', 'Households'],
                  ['6', 'Completed'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-[34px] font-semibold text-[#5a7c5e]">{value}</div>
                    <div className="text-xs uppercase tracking-wide text-[#78776f]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#d8d0c4] px-4 py-3 text-sm font-medium text-[#414541]">
            Edit Profile
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
            <div className="mb-4 text-2xl font-semibold text-[#5a7c5e]">My Tasks</div>
            <div className="space-y-3">
              {['Grocery pickup', 'Bathroom reset', 'Review household wiki'].map((item) => (
                <div key={item} className="rounded-xl bg-[#faf5ee] p-3 text-sm text-[#303430]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-2xl font-semibold text-[#5a7c5e]">My Calendar</div>
              <div className="rounded-2xl border border-[#d8d0c4] px-4 py-2 text-sm font-medium text-[#414541]">
                Add Event
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }, (_, index) => (
                <div
                  key={index}
                  className={[
                    'min-h-[72px] rounded-2xl border p-2 text-xs',
                    index === 10 ? 'border-[#73906f] bg-[#ebf4e8]' : 'border-[#ece4d9] bg-[#fffdfa]',
                  ].join(' ')}
                >
                  <div className="font-medium text-[#5e635e]">{index + 8}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function MockWikiImage() {
  return (
    <BrowserFrame>
      <div className="space-y-5 p-5 text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[30px] font-semibold text-[#202722]">Household Wiki</div>
            <div className="mt-1 text-sm text-[#6e746f]">Shared knowledge base for your household</div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-[#d8d0c4] px-4 py-3 text-sm font-medium text-[#414541]">
              Manage Sections
            </div>
            <div className="rounded-2xl bg-[#6f886a] px-4 py-3 text-sm font-medium text-white">
              Edit Wiki
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.28fr_0.72fr]">
          <div className="rounded-[24px] bg-[#f7f1e8] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7d786f]">
              Contents
            </div>
            <div className="space-y-2">
              {[
                'Garbage & Recycling',
                'Appliances',
                'Bills & Subscriptions',
                'Parking & Storage',
              ].map((item, index) => (
                <div
                  key={item}
                  className={[
                    'rounded-xl px-3 py-3 text-sm',
                    index === 0 ? 'bg-[#dfeadd] font-medium text-[#355234]' : 'text-[#585f59]',
                  ].join(' ')}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {['Garbage & Recycling', 'Appliances', 'Bills & Subscriptions'].map((section) => (
              <div key={section} className="rounded-[24px] border border-[#e8dfd3] bg-white p-5">
                <div className="text-2xl font-semibold text-[#5a7c5e]">{section}</div>
                <div className="mt-4 border-t border-[#ece4d9] pt-4 text-sm italic text-[#8a847b]">
                  Add shared notes, routines, and expectations here
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

const slides: Slide[] = [
  { id: 'households', label: 'Households', content: <MockHouseholdsImage /> },
  { id: 'dashboard', label: 'Dashboard', content: <MockDashboardImage /> },
  { id: 'profile', label: 'Profile', content: <MockProfileImage /> },
  { id: 'wiki', label: 'Wiki', content: <MockWikiImage /> },
];

export default function Hero({ onGetStarted }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function goToSlide(nextIndex: number) {
    if (nextIndex < 0) {
      setActiveIndex(slides.length - 1);
      return;
    }

    if (nextIndex >= slides.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(nextIndex);
  }

  return (
    <section className="bg-gradient-to-br from-soft-highlight to-surface px-6 py-8 text-center">
      <div className="mx-auto max-w-[1020px]">
        <h1 className="mb-4 text-[2.35rem] font-bold text-text-primary max-md:text-3xl">
          Harmony at Home
        </h1>
        <p className="mx-auto mb-6 max-w-[900px] text-[1.05rem] leading-relaxed text-text-secondary max-md:text-base">
          Coordinate chores, share calendars, and bring peace to your household.
          TaskTogether makes living together easier for everyone.
        </p>
        <div className="mb-7">
          <button
            onClick={onGetStarted}
            className="h-11 rounded-sm bg-sage px-6 py-2.5 text-[0.95rem] font-medium text-white transition-all hover:-translate-y-px hover:bg-sage-hover hover:shadow-[0_4px_12px_rgba(90,124,94,0.3)]"
          >
            Get Started Free
          </button>
        </div>

        <div className="mx-auto max-w-[920px] rounded-[28px] border border-[#dad0c3] bg-surface p-5 shadow-[0_16px_46px_rgba(62,49,35,0.14)]">
          <div
            className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-sage via-[#8d836b] to-terracotta px-4 py-4 md:px-5"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              if (touchStartX === null) return;
              const delta = event.changedTouches[0]?.clientX - touchStartX;
              if (Math.abs(delta) > 40) {
                goToSlide(activeIndex + (delta < 0 ? 1 : -1));
              }
              setTouchStartX(null);
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />

            <div className="relative">{slides[activeIndex].content}</div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goToSlide(activeIndex - 1)}
              aria-label="Previous preview"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7cdc0] bg-white text-2xl text-[#6b735f] shadow-sm transition hover:border-[#c4b8a7] hover:bg-[#faf7f1]"
            >
              ‹
            </button>

            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="flex items-center gap-2"
                aria-label={`Show ${slide.label} preview`}
              >
                <span
                  className={[
                    'h-2.5 rounded-full transition-all',
                    index === activeIndex ? 'w-8 bg-sage' : 'w-2.5 bg-[#cbc2b7]',
                  ].join(' ')}
                />
                <span
                  className={[
                    'text-sm font-medium transition-colors',
                    index === activeIndex ? 'text-sage' : 'text-text-secondary',
                  ].join(' ')}
                >
                  {slide.label}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => goToSlide(activeIndex + 1)}
              aria-label="Next preview"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7cdc0] bg-white text-2xl text-[#6b735f] shadow-sm transition hover:border-[#c4b8a7] hover:bg-[#faf7f1]"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

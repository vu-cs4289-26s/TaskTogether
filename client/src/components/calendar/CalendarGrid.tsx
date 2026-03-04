'use client';

import type { Activity, ActivityType } from '@/types/activities';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  activities: Activity[];
  onDayClick?: (date: Date) => void;
  selectedDate?: Date | null;
}

type DayCell = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date) {
  // local date key (not UTC)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function extractTag(desc: string | null | undefined, key: string): string | null {
  if (!desc) return null;
  const re = new RegExp(`\\[\\[${key}:([^\\]]+)\\]\\]`, 'i');
  const m = desc.match(re);
  return m?.[1]?.trim() ?? null;
}

type DotKey =
  | 'meeting'
  | 'shared-space'
  | 'social'
  | 'maintenance'
  | 'other'
  | 'personal'
  | 'household'
  | ActivityType;

const dotColorByKey: Record<string, string> = {
  // ----- Household subtypes -----
  meeting: 'bg-text-secondary',        
  'shared-space': 'bg-terracotta',    
  social: 'bg-sage',              
  maintenance: 'bg-amber-900',         
  other: 'bg-pending',       

  // ----- Profile subtypes -----
  personal: 'bg-pending',                
  household: 'bg-terracotta',            
};

function normalizeTypeKey(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  // allow a couple aliases just in case
  if (s === 'sharedspace' || s === 'shared_space') return 'shared-space';
  return s;
}

export default function CalendarGrid({ year, month, activities, onDayClick, selectedDate }: CalendarGridProps) {
  const today = new Date();

  // Group dot-keys by day
  const byDay = new Map<string, string[]>();

  for (const a of activities) {
    const d = new Date(a.scheduledAt);
    const key = dateKey(d);

    // Prefer TT_TYPE for dot color if present
    const tt = normalizeTypeKey(extractTag(a.description, 'TT_TYPE'));
    const dotKey: string = tt ?? a.activityType; // fallback to ActivityType enum

    const arr = byDay.get(key) ?? [];
    arr.push(dotKey);
    byDay.set(key, arr);
  }

  // Build 6-week grid (42 cells)
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0=Sun
  const startDate = new Date(year, month, 1 - startDow);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
      isToday: sameDay(d, today),
    });
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-text-secondary py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          const key = dateKey(c.date);
          const keys = byDay.get(key) ?? [];
          const uniqueKeys = Array.from(new Set(keys)).slice(0, 4);

          const isSelected = selectedDate ? sameDay(c.date, selectedDate) : false;

          const base = 'aspect-square border rounded p-1 text-sm cursor-pointer transition-all';
          const outside = 'border-divider text-text-secondary opacity-40 bg-surface';
          const normal = 'border-divider bg-surface hover:border-sage hover:bg-soft-highlight';
          const todayStyle = 'bg-sage/30 text-text-primary font-semibold border-sage/50';

          const selectedRing = isSelected ? 'ring-2 ring-sage ring-offset-2 ring-offset-surface' : '';
          const cls = `${base} ${c.isToday ? todayStyle : c.inMonth ? normal : outside} ${selectedRing}`;

          return (
            <div key={idx} className={cls} onClick={() => onDayClick?.(c.date)} title={key}>
              {c.date.getDate()}

              {uniqueKeys.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap">
                  {uniqueKeys.map((k) => (
                    <div key={k} className={`w-2.5 h-2.5 rounded-full ${dotColorByKey[k] ?? 'bg-pending'}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
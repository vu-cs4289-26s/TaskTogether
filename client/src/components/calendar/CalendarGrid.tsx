'use client';

import type { Activity } from '@/types/activities';

// TODO: Implement CalendarGrid component
// - Render a 7-column grid for the given month/year
// - Accept activities array and highlight days that have scheduled activities
// - Show colored dots based on activityType:
//     CHORE: bg-sage, BONDING: bg-terracotta, HOMEWORK: bg-info, OTHER: bg-pending
// - Highlight today's date with bg-sage text-white
// - Gray out days from previous/next months (opacity-40)
// - Support onDayClick callback for selecting a day
// - Reference: the static calendar in client/src/app/profile/page.tsx for styling patterns

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  activities: Activity[];
  onDayClick?: (date: Date) => void;
  selectedDate?: Date | null;
}

export default function CalendarGrid({
  year,
  month,
  activities,
  onDayClick,
  selectedDate,
}: CalendarGridProps) {
  // TODO: Calculate days in month, first day of week, days from prev/next months
  // TODO: Group activities by date for dot rendering

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-text-secondary py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* TODO: Generate day cells for the month */}
      <div className="grid grid-cols-7 gap-1">
        {/* Placeholder — implement day cell rendering */}
      </div>
    </div>
  );
}

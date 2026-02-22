'use client';

import AppNavbar from '@/components/shared/AppNavbar';

// TODO: Implement the Calendar page
// - Display a monthly calendar grid using the CalendarGrid component
// - Fetch activities using listActivitiesApi from @/lib/activities.api
// - Show activity dots/indicators on calendar days that have scheduled activities
// - Add "Create Event" button that opens CreateEventModal (import from @/components/modals/CreateEventModal)
// - Clicking a day should show a list of activities for that day (use ActivityCard)
// - Support month navigation (prev/next buttons)
// - Color code by activityType:
//     CHORE: bg-sage, BONDING: bg-terracotta, HOMEWORK: bg-info, OTHER: bg-pending

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="max-w-[900px] mx-auto px-6 pt-12 pb-8 text-center">
        <h1 className="text-[32px] font-heading font-bold mb-4">Calendar</h1>
        <p className="text-text-secondary text-lg">
          View and schedule household activities
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-6 pb-12">
        {/* TODO: Add month navigation header */}
        {/* TODO: Render CalendarGrid component */}
        {/* TODO: Add "Create Event" button */}
        {/* TODO: Show activity list for selected day */}
        <div className="text-center text-text-secondary py-12">
          Calendar page coming soon.
        </div>
      </div>
    </div>
  );
}

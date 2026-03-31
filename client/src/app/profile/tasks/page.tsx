'use client';

import AppNavbar from '@/components/shared/AppNavbar';

export default function ProfileTasksPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <h1 className="text-2xl font-heading font-bold text-text-primary">
          My Taskboard
        </h1>
        <p className="text-sm text-text-secondary mt-1">Coming soon; personal kanban board</p>
      </div>
    </div>
  );
}

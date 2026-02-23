'use client';

import AppNavbar from '@/components/shared/AppNavbar';

// TODO: Implement the Issues page
// - Fetch issues for the selected household using listIssuesApi
// - Display issues in a filterable list with status badges (OPEN, IN_PROGRESS, RESOLVED, ARCHIVED)
// - Add filter tabs/buttons for status
// - Add "Report Issue" button that opens ReportIssueModal (import from @/components/modals/ReportIssueModal)
// - Each issue card should use the IssueCard component
// - Clicking an issue should expand or show IssueDetailPanel

export default function IssuesPage() {
  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="max-w-[900px] mx-auto px-6 pt-12 pb-8 text-center">
        <h1 className="text-[32px] font-heading font-bold mb-4">Issues</h1>
        <p className="text-text-secondary text-lg">
          Report and track household issues
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-6 pb-12">
        {/* TODO: Add status filter tabs */}
        {/* TODO: Add "Report Issue" button */}
        {/* TODO: Render issue list using IssueCard components */}
        <div className="text-center text-text-secondary py-12">
          Issues page coming soon.
        </div>
      </div>
    </div>
  );
}

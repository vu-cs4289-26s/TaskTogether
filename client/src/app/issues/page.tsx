'use client';

import { useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';
import Button from '@/components/ui/Button';
import ReportIssueModal, { ReportIssueFormValues } from '@/components/modals/ReportIssueModal';


// TODO: Implement the Issues page
// - Fetch issues for the selected household using listIssuesApi
// - Display issues in a filterable list with status badges (OPEN, IN_PROGRESS, RESOLVED, ARCHIVED)
// - Add filter tabs/buttons for status
// - Add "Report Issue" button that opens ReportIssueModal (import from @/components/modals/ReportIssueModal)
// - Each issue card should use the IssueCard component
// - Clicking an issue should expand or show IssueDetailPanel

export default function IssuesPage() {


    const [reportOpen, setReportOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(input: ReportIssueFormValues) {
        try {
            setIsSubmitting(true);
            setError(null);

            // TODO (next step): call createIssueApi(input)
            // await createIssueApi(input);
            console.log('ReportIssue submit:', input);

            setReportOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to submit issue.');
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <div className="min-h-screen bg-base">
            <AppNavbar />

            <div className="max-w-[900px] mx-auto px-6 pt-12 pb-8 text-center">
                <h1 className="text-[32px] font-heading font-bold mb-4">Issues</h1>
                <p className="text-text-secondary text-lg">Report and track household issues</p>
            </div>

            <div className="max-w-[900px] mx-auto px-6 pb-12">
                <div className="flex justify-end mb-6">
                    <Button variant="primary" lift onClick={() => setReportOpen(true)}>
                        Report Issue
                    </Button>
                </div>

                <div className="text-center text-text-secondary py-12">
                    Issues page coming soon.
                </div>
            </div>

            <ReportIssueModal
                open={reportOpen}
                isSubmitting={isSubmitting}
                error={error}
                onClose={() => {
                    if (isSubmitting) return; 
                    setReportOpen(false);
                    setError(null);
                }}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

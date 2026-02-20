'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { listHouseholds } from '@/lib/households';
import type { Household } from '@/types/households';

import AddHouseholdModal from '@/components/households/AddHouseholdModal';
import { createHousehold } from '@/lib/households';


export default function HouseholdsPage() {
    const router = useRouter();

    const [households, setHouseholds] = useState<Household[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    async function handleCreateHousehold(input: { name: string; description?: string }) {
        try {
            setIsCreating(true);
            setCreateError(null);

            const created = await createHousehold(input);

            setHouseholds((prev) => [created, ...prev]);
            setIsAddOpen(false);

            router.push(`/households/${created.id}`);
        } catch {
            setCreateError('Failed to create household. Please try again.');
        } finally {
            setIsCreating(false);
        }
    }


    useEffect(() => {
        listHouseholds()
            .then((data) => setHouseholds(data))
            .catch((err) => {
                const e = err as { response?: { data?: { error?: { message?: string } } } };
                setError(e.response?.data?.error?.message || 'Failed to load households.');
            })
            .finally(() => setLoading(false));
    }, []);
    return (
        <div className="min-h-screen bg-base">
            <AppNavbar />

            <div className="max-w-[900px] mx-auto px-6 pt-12 pb-8 text-center">
                <h1 className="text-[32px] font-heading font-bold mb-4">My Households</h1>
                <p className="text-text-secondary text-lg">
                    Manage all your households in one place
                </p>
            </div>

            <div className="max-w-[900px] mx-auto px-6 pb-12">
                <div className="flex justify-end mb-6">
                    <button
                        type="button"
                        onClick={() => setIsAddOpen(true)}
                        className="px-6 py-3 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Household
                    </button>
                </div>

                <div className="grid gap-6">
                    {households.map((h) => {
                        const members = Array.isArray(h.members) ? h.members : [];
                        const memberCount =
                            typeof h.memberCount === 'number' ? h.memberCount : members.length;

                        const name =
                            typeof h.name === 'string' && h.name.trim() ? h.name.trim() : 'Untitled household';

                        const stats = h.stats ?? { activeChores: 0, openIssues: 0, thisMonth: 0 };
                        const activeChores = typeof stats.activeChores === 'number' ? stats.activeChores : 0;
                        const openIssues = typeof stats.openIssues === 'number' ? stats.openIssues : 0;
                        const thisMonth = typeof stats.thisMonth === 'number' ? stats.thisMonth : 0;

                        const extraCount = Math.max(0, memberCount - members.length);

                        return (
                            <Link
                                key={h.id}
                                href={`/households/${h.id}`}
                                className="group block bg-surface rounded-md p-8 shadow-sm border border-divider transition-all hover:-translate-y-1 hover:shadow-md hover:border-sage cursor-pointer no-underline"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-heading font-semibold text-sage mb-1">
                                            {name}
                                        </h3>

                                        <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                                            <span>{memberCount} members</span>
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
                                            {members.map((m, i) => (
                                                <div
                                                    key={`${h.id}-m-${i}`}
                                                    className="w-8 h-8 rounded-full border-2 border-divider flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: m?.color ?? '#6E6E70' }}
                                                    title={m?.initials ?? ''}
                                                >
                                                    {m?.initials ?? '?'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <svg
                                        className="w-6 h-6 text-text-secondary transition-all group-hover:text-sage group-hover:translate-x-1"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </div>

                                <div className="flex gap-8 pt-4 border-t border-divider flex-wrap md:flex-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-text-primary">
                                            {activeChores}
                                        </span>
                                        <span className="text-xs text-text-secondary uppercase tracking-wide">
                                            Active Chores
                                        </span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-text-primary">
                                            {openIssues}
                                        </span>
                                        <span className="text-xs text-text-secondary uppercase tracking-wide">
                                            Open Issues
                                        </span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-text-primary">
                                            {thisMonth}
                                        </span>
                                        <span className="text-xs text-text-secondary uppercase tracking-wide">
                                            This Month
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <AddHouseholdModal
                open={isAddOpen}
                isSubmitting={isCreating}
                error={createError}
                onClose={() => {
                    if (!isCreating) {
                        setIsAddOpen(false);
                        setCreateError(null);
                    }
                }}
                onCreate={handleCreateHousehold}
            />

        </div>
    );

}

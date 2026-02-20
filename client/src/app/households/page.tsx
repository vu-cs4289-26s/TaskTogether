'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { listHouseholds, createHousehold } from '@/lib/households';
import type { Household } from '@/types/households';
import { getInitials, getAvatarColor } from '@/types/households';
import AddHouseholdModal from '@/components/households/AddHouseholdModal';

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

            const created = await createHousehold({ name: input.name });
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
                {loading && (
                    <div className="text-center text-text-secondary py-12">Loading...</div>
                )}

                {error && (
                    <div className="text-center text-red-600 py-12">{error}</div>
                )}

                {!loading && !error && (
                    <>
                        <div className="flex justify-end mb-6">
                            <button
                                type="button"
                                onClick={() => setIsAddOpen(true)}
                                className="px-6 py-3 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                New Household
                            </button>
                        </div>

                        {households.length === 0 && (
                            <div className="text-center text-text-secondary py-12">
                                No households yet. Create one to get started!
                            </div>
                        )}

                        <div className="grid gap-6">
                            {households.map((h) => {
                                const members = Array.isArray(h.members) ? h.members : [];
                                const memberCount = members.length;
                                const name = h.name?.trim() || 'Untitled household';
                                const isAdmin = h.myRole === 'ADMIN';

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
                                                    <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                                                    {isAdmin && (
                                                        <>
                                                            <span>&bull;</span>
                                                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-sage/10 text-sage border border-sage">
                                                                Admin
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex gap-1 mt-2">
                                                    {members.slice(0, 6).map((m) => (
                                                        <div
                                                            key={m.id}
                                                            className="w-8 h-8 rounded-full border-2 border-divider flex items-center justify-center text-xs font-semibold text-white"
                                                            style={{ backgroundColor: getAvatarColor(m.user.id) }}
                                                            title={m.user.name}
                                                        >
                                                            {getInitials(m.user.name)}
                                                        </div>
                                                    ))}
                                                    {memberCount > 6 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-divider flex items-center justify-center text-xs font-semibold text-text-secondary bg-soft-highlight">
                                                            +{memberCount - 6}
                                                        </div>
                                                    )}
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

                                        <div className="flex gap-8 pt-4 border-t border-divider text-sm text-text-secondary">
                                            <span>Created {new Date(h.createdAt).toLocaleDateString()}</span>
                                            <span>&bull;</span>
                                            <span>Your role: {h.myRole}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}
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

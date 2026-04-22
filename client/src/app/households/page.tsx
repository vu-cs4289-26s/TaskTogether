'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppNavbar from '@/components/shared/AppNavbar';
import { listHouseholds, createHousehold } from '@/lib/households';
import { joinHouseholdApi, sendEmailInviteApi } from '@/lib/households.api';
import type { Household } from '@/types/households';
import Avatar from '@/components/ui/Avatar';
import AddHouseholdModal from '@/components/modals/AddHouseholdModal';
import JoinHouseholdModal from '@/components/modals/JoinHouseholdModal';
import { getErrorMessage } from '@/lib/errorMessage';


export default function HouseholdsPage() {
    const router = useRouter();

    const [households, setHouseholds] = useState<Household[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreateHousehold(input: { name: string; description?: string; emailsToInvite?: string[] }) {
    try {
      setIsCreating(true);
      setCreateError(null);

      const created = await createHousehold({ name: input.name });
      setHouseholds((prev) => [created, ...prev]);
      setIsAddOpen(false);

      // Send email invites if provided
      if (input.emailsToInvite && input.emailsToInvite.length > 0) {
        const invitePromises = input.emailsToInvite.map((email) =>
          sendEmailInviteApi(created.id, email).catch((err) => {
            console.error(`Failed to send invite to ${email}:`, err);
            return null;
          })
        );
        await Promise.all(invitePromises);
      }

      router.push(`/households/${created.id}`);
    } catch (err: unknown) {
      setCreateError(
        getErrorMessage(
          err,
          'Could not create the household. Check the household name and try again.'
        )
      );
    } finally {
      setIsCreating(false);
    }
  }

    async function handleJoinHousehold(code: string) {
        try {
            setIsJoining(true);
            setJoinError(null);

            const joined = await joinHouseholdApi(code);
            setHouseholds((prev) => [joined, ...prev]);
            setIsJoinOpen(false);

            router.push(`/households/${joined.id}`);
        } catch (err: unknown) {
            setJoinError(
                getErrorMessage(
                    err,
                    'Could not join the household. Check the invite code and try again.'
                )
            );
        } finally {
            setIsJoining(false);
        }
    }

    useEffect(() => {
        listHouseholds()
            .then((data) => setHouseholds(data))
            .catch((err) => {
                setError(
                    getErrorMessage(
                        err,
                        'Could not load your households. Refresh the page or log in again.'
                    )
                );
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
                        <div className="flex justify-end gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => setIsJoinOpen(true)}
                                className="px-6 py-3 rounded-sm border border-sage text-sage font-medium flex items-center gap-2 transition-all hover:bg-sage/10 hover:-translate-y-px"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                Join Household
                            </button>
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
                  <Avatar
                    key={m.id}
                    src={m.user.avatar}
                    name={m.user.name}
                    userKey={m.user.id}
                    size="sm"
                    className="border-2 border-divider"
                  />
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

            <JoinHouseholdModal
                open={isJoinOpen}
                isSubmitting={isJoining}
                error={joinError}
                onClose={() => {
                    if (!isJoining) {
                        setIsJoinOpen(false);
                        setJoinError(null);
                    }
                }}
                onJoin={handleJoinHousehold}
            />
        </div>
    );
}

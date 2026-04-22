'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { joinHouseholdApi } from '@/lib/households.api';
import { getErrorMessage } from '@/lib/errorMessage';
import Link from 'next/link';

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const code = params?.code;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // If authenticated, auto-join
  useEffect(() => {
    if (!code || authLoading) return;

    if (!user) {
      // Not authenticated - show invite card
      setIsLoading(false);
      return;
    }

    async function autoJoin() {
      try {
        await joinHouseholdApi(code);
        setJoinSuccess(true);
        // Redirect after a brief delay to show success
        setTimeout(() => {
          router.push('/households');
        }, 1500);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
        const errorCode = e.response?.data?.error?.code;

        if (errorCode === 'HOUSEHOLD_ALREADY_MEMBER') {
          // Already a member, redirect immediately
          router.push('/households');
          return;
        }

        setError(
          getErrorMessage(
            err,
            'Could not join this household. The invite may be expired or invalid.'
          )
        );
        setIsLoading(false);
      }
    }

    autoJoin();
  }, [user, code, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface rounded-md shadow-lg border border-divider p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-heading font-semibold text-text-primary mb-2">
            Successfully Joined!
          </h1>
          <p className="text-text-secondary mb-4">
            You&apos;ve joined the household. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface rounded-md shadow-lg border border-divider p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-urgent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-urgent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-heading font-semibold text-text-primary mb-2">
            Invitation Error
          </h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-sm bg-sage text-white font-medium transition hover:bg-sage-hover"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show invitation card for unauthenticated users
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface rounded-md shadow-lg border border-divider p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
            You&apos;re Invited!
          </h1>
          <p className="text-text-secondary">
            You&apos;ve been invited to join a household on TaskTogether.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/?redirect=/invite/${code}`}
            className="w-full px-6 py-3 rounded-sm bg-sage text-white font-medium text-center transition hover:bg-sage-hover"
          >
            Log In & Join
          </Link>
          <Link
            href={`/?mode=register&redirect=/invite/${code}`}
            className="w-full px-6 py-3 rounded-sm border border-divider bg-transparent text-text-primary font-medium text-center transition hover:bg-base"
          >
            Create Account & Join
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-text-tertiary">
          This invitation link will expire in 7 days.
        </p>
      </div>
    </div>
  );
}

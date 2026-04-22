'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { HouseholdMember } from '@/types/households';
import Avatar from '@/components/ui/Avatar';
import { 
  createInviteApi, 
  getActiveInviteApi, 
  expireInviteApi, 
  removeMemberApi, 
  promoteMemberApi, 
  sendEmailInviteApi,
  getDeleteVoteStatusApi,
  castDeleteVoteApi,
  retractDeleteVoteApi,
  type DeleteVoteStatus,
} from '@/lib/households.api';
import { getErrorMessage } from '@/lib/errorMessage';

type Props = {
  open: boolean;
  householdId: string;
  members: HouseholdMember[];
  myRole: 'ADMIN' | 'MEMBER';
  currentUserId: string;
  onClose: () => void;
  onMembersChanged: () => void;
};

export default function ManageMembersModal({
  open,
  householdId,
  members,
  myRole,
  currentUserId,
  onClose,
  onMembersChanged,
}: Props) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFetching, setInviteFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Email invite states
  const [emailToInvite, setEmailToInvite] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const isAdmin = myRole === 'ADMIN';

  // Delete vote states
  const [deleteVoteStatus, setDeleteVoteStatus] = useState<DeleteVoteStatus | null>(null);
  const [deleteVoteLoading, setDeleteVoteLoading] = useState(false);
  const [showDeleteVoteConfirm, setShowDeleteVoteConfirm] = useState(false);

  // Fetch active invite and delete vote status when modal opens
  useEffect(() => {
    if (!open || !isAdmin) return;

    let cancelled = false;
    (async () => {
      try {
        setInviteFetching(true);
        const [active, voteStatus] = await Promise.all([
          getActiveInviteApi(householdId),
          getDeleteVoteStatusApi(householdId),
        ]);
        if (!cancelled) {
          setInviteCode(active?.code ?? null);
          setInviteExpiresAt(active?.expiresAt ?? null);
          setDeleteVoteStatus(voteStatus);
        }
      } catch {
        // Non-critical, just don't show data
      } finally {
        if (!cancelled) setInviteFetching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, householdId, isAdmin]);

  // Reset copied state after 2s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!open) return null;

  async function handleGenerateInvite() {
    try {
      setInviteLoading(true);
      setError(null);
      const { code, expiresAt } = await createInviteApi(householdId);
      setInviteCode(code);
      setInviteExpiresAt(expiresAt);
    } catch {
      setError('Failed to generate invite code.');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleExpireInvite() {
    try {
      setInviteLoading(true);
      setError(null);
      await expireInviteApi(householdId);
      setInviteCode(null);
      setInviteExpiresAt(null);
    } catch {
      setError('Failed to expire invite code.');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      setActionLoading(userId);
      setError(null);
      await removeMemberApi(householdId, userId);
      onMembersChanged();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Could not remove this member. Make sure you are an admin and try again.'
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePromote(userId: string) {
    try {
      setActionLoading(userId);
      setError(null);
      await promoteMemberApi(householdId, userId);
      onMembersChanged();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Could not promote this member. Make sure you are an admin and try again.'
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeave() {
    try {
      setActionLoading(currentUserId);
      setError(null);
      await removeMemberApi(householdId, currentUserId);
      onMembersChanged();
      onClose();
      // Redirect to households list after leaving
      router.push('/households');
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Could not leave this household. Refresh the page and try again.'
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  function handleCopyCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
    }
  }

  async function handleSendEmailInvite() {
    setEmailError(null);
    setEmailSent(false);

    if (!emailToInvite || !emailToInvite.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    try {
      setEmailSending(true);
      await sendEmailInviteApi(householdId, emailToInvite);
      setEmailSent(true);
      setEmailToInvite('');
    } catch (err: unknown) {
      setEmailError(
        getErrorMessage(
          err,
          'Could not send the invite email. Check the email address and mail settings, then try again.'
        )
      );
    } finally {
      setEmailSending(false);
    }
  }

  function formatExpiry(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires in 1 day';
    return `Expires in ${diffDays} days`;
  }

  // Delete vote handlers
  async function handleCastDeleteVote() {
    try {
      setDeleteVoteLoading(true);
      setError(null);
      const result = await castDeleteVoteApi(householdId);
      if (result.deleted) {
        // Household was deleted - redirect
        onClose();
        router.push('/households');
        return;
      }
      // Refresh vote status
      const status = await getDeleteVoteStatusApi(householdId);
      setDeleteVoteStatus(status);
      setShowDeleteVoteConfirm(false);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Could not submit your household delete vote. Refresh the page and try again.'
        )
      );
    } finally {
      setDeleteVoteLoading(false);
    }
  }

  async function handleRetractDeleteVote() {
    try {
      setDeleteVoteLoading(true);
      setError(null);
      await retractDeleteVoteApi(householdId);
      // Refresh vote status
      const status = await getDeleteVoteStatusApi(householdId);
      setDeleteVoteStatus(status);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Could not retract your household delete vote. Refresh the page and try again.'
        )
      );
    } finally {
      setDeleteVoteLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Manage household members"
    >
      <div className="w-full max-w-[560px] bg-surface rounded-md shadow-lg border border-divider p-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 pb-6 border-b-4 border-sage">
          <h2 className="text-2xl font-heading font-semibold text-sage">
            Manage Members
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {members.length} member{members.length !== 1 ? 's' : ''} in this household
          </p>
        </div>

        {/* Member List */}
        <div className="flex flex-col gap-3 mb-6">
          {members.map((m) => {
            const isSelf = m.user.id === currentUserId;
            const isLoading = actionLoading === m.user.id;

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-sm border border-divider"
              >
                <Avatar
                  src={m.user.avatar}
                  name={m.user.name}
                  userKey={m.user.id}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {m.user.name}
                      {isSelf && <span className="text-text-secondary font-normal"> (you)</span>}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        m.role === 'ADMIN'
                          ? 'bg-sage/10 text-sage border border-sage'
                          : 'bg-soft-highlight text-text-secondary border border-divider'
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                  <div className="text-[12px] text-text-secondary truncate">{m.user.email}</div>
                </div>

                {/* Admin actions */}
                {isAdmin && !isSelf && m.role === 'MEMBER' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePromote(m.user.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-sm border border-sage text-sage hover:bg-sage/10 transition disabled:opacity-50"
                    >
                      Promote
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-sm border border-urgent text-urgent hover:bg-urgent/10 transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite Section (Admin only) */}
        {isAdmin && (
          <div className="mb-6 p-4 rounded-sm border-l-4 border-sage bg-gradient-to-br from-sage/5 to-terracotta/5">
            <div className="text-base font-heading font-semibold text-sage mb-2">
              Invite New Member
            </div>

            {inviteFetching ? (
              <div className="text-sm text-text-secondary">Loading invite...</div>
            ) : inviteCode ? (
              <div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary font-mono text-lg tracking-wider text-center">
                    {inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-4 py-3 rounded-sm bg-sage text-white font-medium text-sm transition hover:bg-sage-hover"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[12px] text-text-secondary">
                    {inviteExpiresAt ? formatExpiry(inviteExpiresAt) : 'Expires in 7 days'}. Anyone with this code can join.
                  </p>
                  <button
                    type="button"
                    onClick={handleExpireInvite}
                    disabled={inviteLoading}
                    className="text-[12px] font-medium text-urgent hover:underline disabled:opacity-50"
                  >
                    Expire Code
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px disabled:opacity-60"
              >
                {inviteLoading ? 'Generating...' : 'Generate Invite Code'}
              </button>
            )}

            {/* Email Invite Section */}
            <div className="mt-4 pt-4 border-t border-divider">
              <div className="text-sm font-medium text-text-secondary mb-2">Or invite by email:</div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailToInvite}
                  onChange={(e) => setEmailToInvite(e.target.value)}
                  placeholder="email@example.com"
                  disabled={emailSending}
                  className="flex-1 px-3 py-2 rounded-sm border border-divider bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage transition disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendEmailInvite();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendEmailInvite}
                  disabled={emailSending || !emailToInvite}
                  className="px-4 py-2 rounded-sm bg-sage text-white font-medium text-sm transition hover:bg-sage-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {emailSending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
        {emailSent && (
          <div className="mt-2 text-sm text-sage">Invite email sent successfully!</div>
        )}
        {emailError && (
          <div className="mt-2 text-sm text-red-600">{emailError}</div>
        )}
      </div>
    </div>
  )}

  {/* Delete Household Voting Section (Admin only) */}
  {isAdmin && deleteVoteStatus && (
    <div className="mb-6 p-4 rounded-sm border-l-4 border-urgent bg-urgent/5">
      <div className="text-base font-heading font-semibold text-urgent mb-2">
        Delete Household
      </div>
      <p className="text-sm text-text-secondary mb-3">
        All admins must vote to delete this household. This action cannot be undone.
      </p>

      {/* Vote progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-text-secondary">
            Votes: {deleteVoteStatus.votesReceived} of {deleteVoteStatus.votesRequired} admins
          </span>
          <span className={deleteVoteStatus.myVote ? 'text-urgent font-medium' : 'text-text-secondary'}>
            {deleteVoteStatus.myVote ? 'You voted to delete' : 'You have not voted'}
          </span>
        </div>
        <div className="h-2 bg-divider rounded-full overflow-hidden">
          <div
            className="h-full bg-urgent transition-all"
            style={{ width: `${deleteVoteStatus.votesRequired > 0 ? (deleteVoteStatus.votesReceived / deleteVoteStatus.votesRequired) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Voters list */}
      {deleteVoteStatus.votes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-1">Admins who voted to delete:</p>
          <div className="flex flex-wrap gap-2">
            {deleteVoteStatus.votes.map((vote) => {
              const voter = members.find((m) => m.user.id === vote.voterId);
              return (
                <span key={vote.voterId} className="text-xs px-2 py-1 rounded-sm bg-urgent/10 text-urgent">
                  {voter?.user.name ?? 'Unknown'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Vote buttons */}
      {!showDeleteVoteConfirm ? (
        <div className="flex gap-3">
          {!deleteVoteStatus.myVote ? (
            <button
              type="button"
              onClick={() => setShowDeleteVoteConfirm(true)}
              disabled={deleteVoteLoading}
              className="px-4 py-2 rounded-sm border border-urgent text-urgent font-medium text-sm transition hover:bg-urgent/10 disabled:opacity-50"
            >
              Vote to Delete
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetractDeleteVote}
              disabled={deleteVoteLoading}
              className="px-4 py-2 rounded-sm border border-divider text-text-secondary font-medium text-sm transition hover:bg-soft-highlight disabled:opacity-50"
            >
              Retract Vote
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-sm bg-urgent/10 border border-urgent/30">
          <p className="text-sm text-text-primary mb-3">
            Are you sure you want to vote to delete this household? All data including tasks, wiki, and activities will be permanently deleted once all admins vote.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCastDeleteVote}
              disabled={deleteVoteLoading}
              className="px-4 py-2 rounded-sm bg-urgent text-white font-medium text-sm transition hover:bg-urgent-hover disabled:opacity-50"
            >
              {deleteVoteLoading ? 'Voting...' : 'Yes, Vote to Delete'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteVoteConfirm(false)}
              disabled={deleteVoteLoading}
              className="px-4 py-2 rounded-sm border border-divider text-text-secondary font-medium text-sm transition hover:bg-soft-highlight"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )}

  {error && (
    <div className="mb-4 text-sm text-red-600">{error}</div>
  )}

  <div className="flex gap-4 justify-between">
    <button
      type="button"
      onClick={handleLeave}
      disabled={actionLoading === currentUserId}
      className="px-5 py-2.5 rounded-sm border border-urgent text-urgent font-medium transition hover:bg-urgent/10 disabled:opacity-50"
    >
      Leave Household
    </button>

    <button
      type="button"
      onClick={onClose}
      className="px-6 py-3 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base"
    >
      Close
    </button>
  </div>
</div>
    </div>
  );
}

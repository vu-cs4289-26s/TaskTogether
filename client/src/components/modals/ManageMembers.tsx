'use client';

import { useState, useMemo } from 'react';
import { Crown, Trash2 } from 'lucide-react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

export type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarTone?: 'sage' | 'terracotta' | 'success' | 'pending';
  role: 'admin' | 'member';
  isYou?: boolean;
};

type Props = {
  open: boolean;
  members: HouseholdMember[];
  canManage: boolean;

  isSubmitting: boolean;
  error: string | null;

  onClose: () => void;

  onPromoteToAdmin?: (memberId: string) => void | Promise<void>;
  onRemoveMember?: (memberId: string) => void | Promise<void>;
  onInvite?: (email: string) => void | Promise<void>;
};

export default function ManageMembersModal({
  open,
  members,
  canManage,
  isSubmitting,
  error,
  onClose,
  onPromoteToAdmin,
  onRemoveMember,
  onInvite,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState('');

  const toneClass = useMemo(
    () => ({
      sage: 'bg-sage',
      terracotta: 'bg-terracotta',
      success: 'bg-success',
      pending: 'bg-pending',
    }),
    []
  );

  async function sendInvite() {
    const trimmed = inviteEmail.trim();
    if (!trimmed || !onInvite) return;
    await onInvite(trimmed);
    setInviteEmail('');
  }

  return (
    <BaseModal
      open={open}
      ariaLabel="Manage members"
      title="Manage Members"
      subtitle="Add, remove, or change member roles"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[680px]"
    >
      <div className="flex flex-col gap-4">
        {/* Members List */}
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-4 border border-divider rounded-sm"
            >
              <div className="flex items-center gap-4">
                <div
                  className={[
                    'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold',
                    toneClass[m.avatarTone ?? 'sage'],
                  ].join(' ')}
                >
                  {m.initials}
                </div>

                <div className="flex flex-col">
                  <div className="font-semibold text-text-primary">
                    {m.name}
                    {m.isYou ? ' (You)' : ''}
                  </div>
                  <div className="text-[13px] text-text-secondary">{m.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide bg-sage text-white">
                  {m.role}
                </span>

                {canManage && !m.isYou && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      title="Promote to admin"
                      onClick={() => onPromoteToAdmin?.(m.id)}
                      disabled={!onPromoteToAdmin || isSubmitting}
                      className="p-2 rounded-sm border border-divider bg-transparent hover:bg-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Crown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      title="Remove member"
                      onClick={() => onRemoveMember?.(m.id)}
                      disabled={!onRemoveMember || isSubmitting}
                      className="p-2 rounded-sm border border-divider bg-transparent hover:bg-urgent/10 hover:border-urgent hover:text-urgent disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invite Section */}
        <div className="mt-2 p-4 rounded-sm border-l-4 border-sage bg-gradient-to-br from-sage/5 to-terracotta/5">
          <div className="text-base font-heading font-semibold text-sage">
            Invite New Member
          </div>

          <div className="mt-3 flex gap-2 items-end">
            <div className="flex-1">
              <Field label="Email" htmlFor="invite-email">
                <input
                  id="invite-email"
                  type="email"
                  placeholder="member@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!onInvite || isSubmitting}
                  className={`${inputClass} ${!onInvite ? 'opacity-70' : ''}`}
                />
              </Field>
            </div>

            <Button
              variant="primary"
              disabled={!onInvite || isSubmitting || !inviteEmail.trim()}
              onClick={sendInvite}
            >
              Send Invite
            </Button>
          </div>

          {!onInvite && (
            <p className="mt-2 text-[13px] text-text-secondary">
              Invites will be wired up later.
            </p>
          )}
        </div>

        {error && <div className="text-sm text-urgent">{error}</div>}

        <div className="flex justify-end mt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
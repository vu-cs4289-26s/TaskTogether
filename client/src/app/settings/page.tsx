'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';
import Toggle from '@/components/settings/toggle';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import api from '@/lib/api';

function formatDeliveryMessage(
  message: string,
  debug?: { code?: string; resetUrl?: string; preview?: string }
) {
  if (!debug) return message;
  if (debug.code) return `${message} Dev code: ${debug.code}`;
  if (debug.resetUrl) return `${message} Dev reset link: ${debug.resetUrl}`;
  if (debug.preview) return `${message} ${debug.preview}`;
  return message;
}

type SectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function SettingsSection({ title, description, children }: SectionProps) {
  return (
    <section className="bg-surface rounded-md p-6 shadow-sm border border-divider mb-6">
      <div className="mb-6 pb-4 border-b border-divider">
        <h2 className="text-lg font-heading font-semibold text-sage mb-1">{title}</h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

type ItemProps = {
  label: string;
  hint?: string;
  right: ReactNode;
  noDivider?: boolean;
};

function SettingItem({ label, hint, right, noDivider }: ItemProps) {
  return (
    <div
      className={[
        'py-4 flex items-center justify-between gap-6',
        noDivider ? '' : 'border-b border-divider',
      ].join(' ')}
    >
      <div className="flex-1">
        <div className="font-semibold text-text-primary">{label}</div>
        {hint && <div className="text-[13px] text-text-secondary mt-1">{hint}</div>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function getPasswordStrengthMessage(password: string): string {
  if (!password) return 'Use at least 8 characters, with uppercase, lowercase, and a number.';
  if (password.length < 8) return 'Too short';
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Add at least one number';
  return 'Strong password';
}

function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function formatPasswordDate(dateString?: string) {
  if (!dateString) return 'No password update date available';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'No password update date available.';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ConnectedGoogleAccount({
  linked,
  email,
}: {
  linked: boolean;
  email?: string | null;
}) {
  return (
    <div className="mt-4 p-4 rounded-sm bg-soft-highlight flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-[#4285F4]">
          <span className="text-white font-bold text-sm">G</span>
        </div>
        <div>
          <div className="font-semibold text-sm">Google</div>
          <div className="text-xs text-text-secondary">
            {linked ? email || 'Connected to your Google account' : 'Not connected'}
          </div>
        </div>
      </div>

      <span
        className={[
          'px-2 py-1 rounded text-[11px] font-semibold uppercase border',
          linked
            ? 'bg-success/10 text-success border-success'
            : 'bg-transparent text-text-secondary border-divider',
        ].join(' ')}
      >
        {linked ? 'Connected' : 'Not Connected'}
      </span>
    </div>
  );
}

type TwoFactorModalProps = {
  isOpen: boolean;
  mode: 'enable' | 'disable';
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  code: string;
  setCode: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

function TwoFactorModal({
  isOpen,
  mode,
  loading = false,
  error = null,
  success = null,
  code,
  setCode,
  onClose,
  onSubmit,
}: TwoFactorModalProps) {
  if (!isOpen) return null;

  const title =
    mode === 'enable'
      ? 'Enable Two-Factor Authentication'
      : 'Disable Two-Factor Authentication';

  const description =
    mode === 'enable'
      ? 'Enter the verification code sent to your email to turn on two-factor authentication.'
      : 'Enter the verification code sent to your email to turn off two-factor authentication.';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/35 px-4 py-10 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-md border border-divider bg-surface shadow-xl my-auto max-h-[calc(100vh-5rem)] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-divider">
          <h2 className="text-2xl font-heading font-semibold text-sage">{title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-sm border border-urgent/30 bg-urgent/10 p-3 text-sm text-urgent">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-sm border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Verification Code"
              htmlFor="twoFactorCode"
              required
              hint="Enter the 6-digit code from your email."
            >
              <input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={inputClass}
                disabled={loading}
              />
            </Field>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : mode === 'enable' ? 'Enable 2FA' : 'Disable 2FA'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passwordUpdatedAt: string) => void;
  twoFactorEnabled: boolean;
};

function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
  twoFactorEnabled,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [passwordChangeCodeSent, setPasswordChangeCodeSent] = useState(false);
  const [sendingPasswordChangeCode, setSendingPasswordChangeCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTwoFactorCode('');
      setPasswordChangeCodeSent(false);
      setSendingPasswordChangeCode(false);
      setLoading(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const strengthMessage = useMemo(
    () => getPasswordStrengthMessage(newPassword),
    [newPassword]
  );

  if (!isOpen) return null;

  async function handleSendPasswordChangeCode() {
    setError(null);
    setSuccess(null);
    setSendingPasswordChangeCode(true);

    try {
      const res = await api.post('/auth/2fa/send-password-change-code');
      setPasswordChangeCodeSent(true);
      setSuccess(
        formatDeliveryMessage(
          res.data?.data?.message || 'A verification code was sent to your email.',
          res.data?.data?.debug
        )
      );
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };

      setError(
        errorObj.response?.data?.error?.message ||
          'Could not send verification code. Please try again.'
      );
    } finally {
      setSendingPasswordChangeCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all password fields.');
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      setError(
        'New password must be at least 8 characters and include uppercase, lowercase, and a number.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    if (twoFactorEnabled) {
      if (!passwordChangeCodeSent) {
        setError('Please send a verification code before updating your password.');
        return;
      }

      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setError('Please enter your 6-digit 2FA verification code.');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        twoFactorCode: twoFactorEnabled ? twoFactorCode : undefined,
      });

      const updatedAt =
        res.data?.data?.passwordUpdatedAt || new Date().toISOString();

      setSuccess(res.data?.data?.message || 'Password changed successfully.');
      onSuccess(updatedAt);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };

      setError(
        errorObj.response?.data?.error?.message ||
          'Could not change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/35 px-4 py-10 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-md border border-divider bg-surface shadow-xl my-auto max-h-[calc(100vh-5rem)] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-divider">
          <h2 className="text-2xl font-heading font-semibold text-sage">
            Change Password
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your current password, then choose a new one.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-sm border border-urgent/30 bg-urgent/10 p-3 text-sm text-urgent">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-sm border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Current Password" htmlFor="currentPassword" required>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                disabled={loading}
              />
            </Field>

            <Field
              label="New Password"
              htmlFor="newPassword"
              required
              hint={strengthMessage}
            >
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                disabled={loading}
              />
            </Field>

            <Field
              label="Confirm New Password"
              htmlFor="confirmPassword"
              required
              hint={
                confirmPassword
                  ? confirmPassword === newPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'
                  : undefined
              }
            >
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                disabled={loading}
              />
            </Field>

            {twoFactorEnabled && (
              <>
                <div className="rounded-sm border border-divider bg-base p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold text-text-primary">
                        Two-Factor Verification
                      </div>
                      <div className="text-[13px] text-text-secondary mt-1">
                        For security, request and enter the code sent to your email before
                        updating your password.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendPasswordChangeCode}
                      disabled={sendingPasswordChangeCode || loading}
                      className="px-4 py-2 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sendingPasswordChangeCode
                        ? 'Sending...'
                        : passwordChangeCodeSent
                        ? 'Resend Code'
                        : 'Send Code'}
                    </button>
                  </div>
                </div>

                <Field
                  label="2FA Code"
                  htmlFor="twoFactorCode"
                  required
                  hint="Enter the 6-digit code from your email."
                >
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) =>
                      setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className={inputClass}
                    disabled={loading}
                  />
                </Field>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [pushNotifs, setPushNotifs] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [notifFreq, setNotifFreq] = useState<
    'realtime' | 'hourly' | 'daily' | 'weekly'
  >('daily');

const [_profileVisibility, _setProfileVisibility] = useState<
  'all' | 'household' | 'private'
>('household');
const [_showStats, _setShowStats] = useState(true);
const [_activityStatus, _setActivityStatus] = useState(true);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState<string>('');
  const [passwordDateLoading, setPasswordDateLoading] = useState(true);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string>('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState<'enable' | 'disable'>('enable');

useEffect(() => {
  async function loadUser() {
    try {
      const res = await api.get('/users/me');
      setPasswordUpdatedAt(res.data?.data?.passwordUpdatedAt || '');
      setTwoFactorEnabled(Boolean(res.data?.data?.twoFactorEnabled));
      setGoogleLinked(Boolean(res.data?.data?.googleLinked));
      setGoogleEmail(res.data?.data?.googleEmail || '');
    } catch {
      setPasswordUpdatedAt('');
      setTwoFactorEnabled(false);
      setGoogleLinked(false);
      setGoogleEmail('');
    } finally {
      setPasswordDateLoading(false);
      setTwoFactorLoading(false);
    }
  }

  loadUser();
}, []);

  function closeTwoFactorModal() {
    setTwoFactorModalOpen(false);
    setTwoFactorCode('');
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
  }

  async function handleOpenTwoFactorModal(mode: 'enable' | 'disable') {
    setTwoFactorMode(mode);
    setTwoFactorCode('');
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    setTwoFactorSubmitting(true);

    try {
      const res =
        mode === 'enable'
          ? await api.post('/auth/2fa/enable')
          : await api.post('/auth/2fa/disable/request');

      setTwoFactorModalOpen(true);
      setTwoFactorSuccess(
        formatDeliveryMessage(
          res.data?.data?.message || 'A verification code was sent to your email.',
          res.data?.data?.debug
        )
      );
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };

      setTwoFactorError(
        errorObj.response?.data?.error?.message ||
          `Could not ${mode === 'enable' ? 'start enabling' : 'start disabling'} 2FA. Please try again.`
      );
      setTwoFactorModalOpen(true);
    } finally {
      setTwoFactorSubmitting(false);
    }
  }

  async function handleSubmitTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorSuccess(null);

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setTwoFactorError('Please enter the 6-digit verification code.');
      return;
    }

    setTwoFactorSubmitting(true);

    try {
      const res =
        twoFactorMode === 'enable'
          ? await api.post('/auth/2fa/verify-enable', {
              code: twoFactorCode,
            })
          : await api.post('/auth/2fa/disable/verify', {
              code: twoFactorCode,
            });

      setTwoFactorEnabled(Boolean(res.data?.data?.twoFactorEnabled));
      setTwoFactorSuccess(
        res.data?.data?.message ||
          (twoFactorMode === 'enable'
            ? 'Two-factor authentication has been enabled.'
            : 'Two-factor authentication has been disabled.')
      );

      setTimeout(() => {
        closeTwoFactorModal();
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
      };

      setTwoFactorError(
        errorObj.response?.data?.error?.message ||
          'Could not verify code. Please try again.'
      );
    } finally {
      setTwoFactorSubmitting(false);
    }
  }

return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="bg-surface border-b border-divider px-6 py-8">
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-[32px] font-heading font-bold">Settings</h1>
          <p className="mt-2 text-text-secondary">
            Manage your application preferences and account settings
          </p>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-6 py-8">
        <SettingsSection
          title="Notifications"
          description="Choose how you want to be notified about household activities"
        >
          <SettingItem
            label="Push Notifications"
            hint="Get real-time notifications on your device"
            right={
              <Toggle
                checked={pushNotifs}
                onChange={setPushNotifs}
                label="Push notifications"
              />
            }
          />
          <SettingItem
            label="Task Reminders"
            hint="Remind me about upcoming task deadlines"
            right={
              <Toggle
                checked={taskReminders}
                onChange={setTaskReminders}
                label="Task reminders"
              />
            }
          />
          <SettingItem
            label="Notification Frequency"
            hint="How often to send email notifications"
            right={
              <select
                value={notifFreq}
                onChange={(e) => setNotifFreq(e.target.value as typeof notifFreq)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly digest</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            }
            noDivider
          />
        </SettingsSection>

        <SettingsSection
          title="Account"
          description="Manage your account security and connected services"
        >
          <div className="py-4 border-b border-divider">
            <div className="font-semibold text-text-primary mb-3">Password</div>
            <div className="p-4 rounded-sm bg-soft-highlight flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">••••••••</div>
                <div className="text-xs text-text-secondary mt-1">
                  {passwordDateLoading
                    ? 'Loading password update date...'
                    : `Last changed on: ${formatPasswordDate(passwordUpdatedAt)}.`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage"
              >
                Change Password
              </button>
            </div>
          </div>

          <div className="py-4 border-b border-divider">
            <div className="font-semibold text-text-primary mb-1">Connected Accounts</div>
            <div className="text-[13px] text-text-secondary">
              Link external accounts for easy sign-in
            </div>

            <ConnectedGoogleAccount linked={googleLinked} email={googleEmail} />
          </div>

          <SettingItem
            label="Two-Factor Authentication"
            hint={
              twoFactorLoading
                ? 'Loading two-factor authentication status...'
                : twoFactorEnabled
                ? 'Two-factor authentication is currently enabled on your account.'
                : 'Add an extra layer of security to your account'
            }
            right={
              <button
                type="button"
                onClick={() =>
                  handleOpenTwoFactorModal(twoFactorEnabled ? 'disable' : 'enable')
                }
                disabled={twoFactorSubmitting || twoFactorLoading}
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {twoFactorSubmitting
                  ? 'Please wait...'
                  : twoFactorEnabled
                  ? 'Disable 2FA'
                  : 'Enable 2FA'}
              </button>
            }
            noDivider
          />
        </SettingsSection>
        
      </main>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={(updatedAt) => {
          setPasswordUpdatedAt(updatedAt);
        }}
        twoFactorEnabled={twoFactorEnabled}
      />

      <TwoFactorModal
        isOpen={twoFactorModalOpen}
        mode={twoFactorMode}
        loading={twoFactorSubmitting}
        error={twoFactorError}
        success={twoFactorSuccess}
        code={twoFactorCode}
        setCode={setTwoFactorCode}
        onClose={closeTwoFactorModal}
        onSubmit={handleSubmitTwoFactor}
      />
    </div>
  );
}

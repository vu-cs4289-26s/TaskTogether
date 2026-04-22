'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import { getErrorMessage } from '@/lib/errorMessage';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setPageError('This password reset link is missing a token.');
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }

      try {
        await api.get('/auth/reset-password/validate', {
          params: { token },
        });
        setTokenValid(true);
        setPageError(null);
      } catch (err: unknown) {
        setTokenValid(false);
        setPageError(
          getErrorMessage(
            err,
            'This password reset link is invalid or has expired. Request a new reset link.'
          )
        );
      } finally {
        setCheckingToken(false);
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setSubmitError(
        'Password must be at least 8 characters and include uppercase, lowercase, a special character, and a number.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        password,
      });

      setSubmitSuccess(res.data?.data?.message || 'Password reset successful.');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: unknown) {
      setSubmitError(
        getErrorMessage(
          err,
          'Could not reset your password. Check the password requirements and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[450px] bg-surface rounded-md shadow-lg border border-divider p-8">
        <div className="mb-6 pb-6 border-b-4 border-sage">
          <h1 className="text-2xl font-heading font-semibold text-sage">
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Set a new password for your account.
          </p>
        </div>

        {checkingToken && (
          <div className="text-sm text-text-secondary">Checking reset link…</div>
        )}

        {!checkingToken && pageError && (
          <div className="space-y-4">
            <div className="p-3 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
              {pageError}
            </div>
            <Button fullWidth onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </div>
        )}

        {!checkingToken && tokenValid && (
          <>
            {submitError && (
              <div className="mb-4 p-3 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="mb-4 p-3 bg-sage/10 border border-sage/30 rounded-sm text-sage text-sm">
                {submitSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field
                label="New Password"
                htmlFor="password"
                required
                hint="Must be at least 8 characters and include uppercase, lowercase, a special character, and a number."
              >
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </Field>

              <Field label="Confirm Password" htmlFor="confirmPassword" required>
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

              <Button
                type="submit"
                fullWidth
                lift
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? 'Resetting…' : 'Set New Password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
  onSubmit,
  loading,
  error,
  successMessage,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(email.trim());
  }

  return (
    <BaseModal
      open={isOpen}
      ariaLabel="Forgot password"
      title="Forgot Password?"
      subtitle="Enter your email and we’ll send you a reset link."
      isBlocking={loading}
      onClose={onClose}
      maxWidthClassName="max-w-[450px]"
    >
      {error && (
        <div className="mb-4 p-3 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-sage/10 border border-sage/30 rounded-sm text-sage text-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="forgot-email" required>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className={inputClass}
            autoComplete="email"
          />
        </Field>

        <Button type="submit" fullWidth lift disabled={loading || !email.trim()}>
          {loading ? 'Sending…' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={onBackToLogin}
          disabled={loading}
          className="text-sage font-medium hover:underline disabled:opacity-60"
        >
          Back to Sign In
        </button>
      </div>
    </BaseModal>
  );
}
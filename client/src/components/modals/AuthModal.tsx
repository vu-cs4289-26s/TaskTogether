'use client';

import { useEffect, useMemo, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onVerifyTwoFactor: (code: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  error: string | null;
  loading: boolean;
  requiresTwoFactor?: boolean;
}

export default function AuthModal({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
  onLogin,
  onVerifyTwoFactor,
  onRegister,
  onForgotPassword,
  error,
  loading,
  requiresTwoFactor = false,
}: AuthModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!requiresTwoFactor) {
      setTwoFactorCode('');
    }
  }, [requiresTwoFactor]);

  const headerTitle = requiresTwoFactor
    ? 'Two-Factor Authentication'
    : mode === 'login'
      ? 'Welcome Back'
      : 'Create Account';

  const headerSubtitle = requiresTwoFactor
    ? 'Enter the 6-digit code sent to your email'
    : mode === 'login'
      ? 'Sign in to manage your households'
      : 'Start organizing your household today';

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const submitDisabled = requiresTwoFactor
    ? loading || twoFactorCode.trim().length !== 6
    : loading ||
      !email.trim() ||
      !password ||
      (mode === 'register' && (!name.trim() || !agreedToTerms));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (requiresTwoFactor) {
      const code = twoFactorCode.trim();

      if (code.length !== 6) {
        setLocalError('Please enter the 6-digit verification code.');
        return;
      }

      await onVerifyTwoFactor(code);
      return;
    }

    const eTrim = email.trim();

    if (mode === 'login') {
      await onLogin(eTrim, password);
      return;
    }

    if (!agreedToTerms) {
      setLocalError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    await onRegister(name.trim(), eTrim, password);
  }

  function handleSwitchMode() {
    setName('');
    setEmail('');
    setPassword('');
    setTwoFactorCode('');
    setAgreedToTerms(false);
    setLocalError(null);
    onSwitchMode();
  }

  return (
    <BaseModal
      open={isOpen}
      ariaLabel={requiresTwoFactor ? 'Two-factor authentication' : mode === 'login' ? 'Log in' : 'Register'}
      title={headerTitle}
      subtitle={headerSubtitle}
      isBlocking={loading}
      onClose={onClose}
      maxWidthClassName="max-w-[450px]"
    >
      {(localError || error) && (
        <div className="mb-4 p-3 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
          {localError ?? error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {requiresTwoFactor ? (
          <Field label="Verification Code" htmlFor="twoFactorCode" required>
            <input
              id="twoFactorCode"
              type="text"
              inputMode="numeric"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              disabled={loading}
              className={inputClass}
              autoComplete="one-time-code"
            />
          </Field>
        ) : (
          <>
            {mode === 'register' && (
              <Field label="Full Name" htmlFor="name" required>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Davis"
                  disabled={loading}
                  className={inputClass}
                  autoComplete="name"
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email" required>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className={inputClass}
                autoComplete="email"
              />
            </Field>

            <div className="flex flex-col gap-1">
              <Field
                label="Password"
                htmlFor="password"
                required
                hint={mode === 'register' ? 'Must be at least 8 characters' : undefined}
              >
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
                  disabled={loading}
                  className={inputClass}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </Field>

              {mode === 'login' && (
                <div className="text-right text-sm">
                  <button
                    type="button"
                    disabled={loading}
                    className="text-sage font-medium hover:underline disabled:opacity-60"
                    onClick={onForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <div className="h-1 rounded bg-divider overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.className}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                />
                <label htmlFor="terms" className="cursor-pointer font-normal text-sm">
                  I agree to the{' '}
                  <span className="text-sage font-medium">Terms of Service</span> and{' '}
                  <span className="text-sage font-medium">Privacy Policy</span>
                </label>
              </div>
            )}
          </>
        )}

        <Button type="submit" fullWidth lift disabled={submitDisabled}>
          {loading
            ? 'Please wait…'
            : requiresTwoFactor
              ? 'Verify Code'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
        </Button>
      </form>

      {!requiresTwoFactor && (
        <>
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-divider" />
            <span className="text-text-secondary text-sm">
              {mode === 'login' ? 'or continue with' : 'or sign up with'}
            </span>
            <div className="flex-1 h-px bg-divider" />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-surface border border-divider text-text-primary font-medium transition-all hover:bg-base disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              type="button"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-surface border border-divider text-text-primary font-medium transition-all hover:bg-base disabled:opacity-60"
            >
              <FacebookIcon />
              Continue with Facebook
            </button>
          </div>

          <div className="text-center mt-4">
            <span className="text-text-secondary">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              type="button"
              onClick={handleSwitchMode}
              disabled={loading}
              className="text-sage font-medium hover:underline disabled:opacity-60"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </>
      )}
    </BaseModal>
  );
}

function getPasswordStrength(password: string) {
  if (!password) return { width: '0%', className: '' };
  if (password.length < 6) return { width: '33%', className: 'bg-urgent' };
  if (password.length < 10) return { width: '66%', className: 'bg-terracotta' };
  return { width: '100%', className: 'bg-sage' };
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
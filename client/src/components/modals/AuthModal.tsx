'use client';

import { useEffect, useRef, useState } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import { loadGoogleIdentityScript } from '@/lib/googleIdentity';
import PasswordRequirements from '@/components/auth/PasswordRequirements';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onVerifyTwoFactor: (code: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onGoogleCredential: (credential: string) => Promise<void>;
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
  onGoogleCredential,
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
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!requiresTwoFactor) {
      setTwoFactorCode('');
    }
  }, [requiresTwoFactor]);

  useEffect(() => {
    if (!isOpen || requiresTwoFactor || !googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    const clientId = googleClientId;

    async function setupGoogleButton() {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) {
              setLocalError('Google sign-in did not return a credential.');
              return;
            }

            try {
              setLocalError(null);
              await onGoogleCredential(response.credential);
            } catch {
              // parent handles API errors; keep this callback quiet
            }
          },
          ux_mode: 'popup',
          context: mode === 'login' ? 'signin' : 'signup',
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          text: 'continue_with',
          shape: 'rectangular',
          size: 'large',
          width: 360,
          logo_alignment: 'left',
        });
      } catch (scriptError) {
        setLocalError(
          scriptError instanceof Error
            ? scriptError.message
            : 'Google sign-in could not be loaded.'
        );
      }
    }

    setupGoogleButton();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [googleClientId, isOpen, mode, onGoogleCredential, requiresTwoFactor]);

  const headerTitle = requiresTwoFactor
    ? 'Two-Factor Authentication'
    : mode === 'login'
      ? 'Welcome Back'
      : 'Create Account';

  const headerSubtitle = requiresTwoFactor
    ? 'Enter the 6-digit code sent to your email'
    : mode === 'login'
      ? 'Log in to manage your households'
      : 'Start organizing your household today';

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
                <PasswordRequirements password={password} className="mt-2" />
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
                ? 'Log In'
                : 'Create Account'}
        </Button>
      </form>

      {!requiresTwoFactor && (
        <>
          {googleClientId && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-divider" />
                <span className="text-text-secondary text-sm">
                  {mode === 'login' ? 'or log in with' : 'or sign up with'}
                </span>
                <div className="flex-1 h-px bg-divider" />
              </div>

              <div className="flex flex-col gap-2">
                <div
                  ref={googleButtonRef}
                  className="min-h-[44px] flex items-center justify-center"
                />
              </div>
            </>
          )}

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

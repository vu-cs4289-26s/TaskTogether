'use client';

import { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

export default function AuthModal({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
  onLogin,
  onRegister,
  error,
  loading,
}: AuthModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await onLogin(email, password);
    } else {
      await onRegister(name, email, password);
    }
  };

  const handleSwitchMode = () => {
    setName('');
    setEmail('');
    setPassword('');
    setAgreedToTerms(false);
    onSwitchMode();
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg p-8 shadow-lg border border-divider w-full max-w-[450px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-heading text-2xl font-bold text-sage mb-2">
            TaskTogether
          </div>
          <h2 className="text-2xl font-semibold mb-1">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-text-secondary text-sm">
            {mode === 'login'
              ? 'Sign in to manage your households'
              : 'Start organizing your household today'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-urgent/10 border border-urgent/30 rounded-sm text-urgent text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name <span className="text-urgent">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Davis"
                required
                className="px-4 py-3 border border-divider rounded-sm text-base transition-all bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-2 focus:border-sage focus:shadow-[0_0_0_3px_rgba(90,124,94,0.1)] focus:px-[15px] focus:py-[11px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-urgent">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="px-4 py-3 border border-divider rounded-sm text-base transition-all bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-2 focus:border-sage focus:shadow-[0_0_0_3px_rgba(90,124,94,0.1)] focus:px-[15px] focus:py-[11px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-urgent">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === 'login'
                  ? 'Enter your password'
                  : 'Create a strong password'
              }
              required
              className="px-4 py-3 border border-divider rounded-sm text-base transition-all bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-2 focus:border-sage focus:shadow-[0_0_0_3px_rgba(90,124,94,0.1)] focus:px-[15px] focus:py-[11px]"
            />
            {mode === 'login' && (
              <div className="text-right text-sm">
                <button type="button" className="text-sage font-medium hover:underline">
                  Forgot password?
                </button>
              </div>
            )}
            {mode === 'register' && (
              <>
                <div className="h-1 rounded bg-divider overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.className}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <span className="text-xs text-text-secondary">
                  Must be at least 8 characters
                </span>
              </>
            )}
          </div>

          {mode === 'register' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <label htmlFor="terms" className="cursor-pointer font-normal text-sm">
                I agree to the{' '}
                <span className="text-sage font-medium">Terms of Service</span>{' '}
                and{' '}
                <span className="text-sage font-medium">Privacy Policy</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && !agreedToTerms)}
            className="px-6 py-3 rounded-sm bg-sage text-white font-medium text-base transition-all hover:bg-sage-hover hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-divider" />
          <span className="text-text-secondary text-sm">
            {mode === 'login' ? 'or continue with' : 'or sign up with'}
          </span>
          <div className="flex-1 h-px bg-divider" />
        </div>

        {/* Social buttons */}
        <div className="flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-surface border border-divider text-text-primary font-medium transition-all hover:bg-base">
            <GoogleIcon />
            Continue with Google
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-surface border border-divider text-text-primary font-medium transition-all hover:bg-base">
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        {/* Switch mode */}
        <div className="text-center mt-4">
          <span className="text-text-secondary">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
          </span>
          <button
            onClick={handleSwitchMode}
            className="text-sage font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
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
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

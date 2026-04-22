'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/modals/AuthModal';
import ForgotPasswordModal from '@/components/modals/ForgotPasswordModal';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessage';

function LandingPageContent() {
  const { user, login, loginWithGoogle, verifyTwoFactorLogin, register } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [pendingTwoFactorUserId, setPendingTwoFactorUserId] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const initialMode = searchParams.get('mode') as 'login' | 'register' | null;

  const openLogin = () => {
    setAuthError(null);
    setPendingTwoFactorUserId(null);
    setModalMode('login');
    setModalOpen(true);
  };

  const openRegister = () => {
    setAuthError(null);
    setPendingTwoFactorUserId(null);
    setModalMode('register');
    setModalOpen(true);
  };

  // Handle redirect and initial mode from URL
  useEffect(() => {
    if (initialMode === 'register') {
      setModalMode('register');
      setModalOpen(true);
    }
  }, [initialMode]);

  const openForgotPassword = () => {
    setAuthError(null);
    setPendingTwoFactorUserId(null);
    setForgotError(null);
    setForgotSuccess(null);
    setModalOpen(false);
    setForgotOpen(true);
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await login(email, password);

      if (result.requires2FA) {
        setPendingTwoFactorUserId(result.userId);
        return;
      }

      setModalOpen(false);
      setPendingTwoFactorUserId(null);
      
      // Handle redirect after successful login
      if (redirect) {
        router.push(redirect);
      }
    } catch (err: unknown) {
      setAuthError(
        getErrorMessage(
          err,
          'Could not log in. Check your email and password, then try again.'
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (code: string) => {
    if (!pendingTwoFactorUserId) {
      setAuthError('Missing verification session. Please try signing in again.');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      await verifyTwoFactorLogin(pendingTwoFactorUserId, code);
      setPendingTwoFactorUserId(null);
      setModalOpen(false);
      
      // Handle redirect after successful 2FA verification
      if (redirect) {
        router.push(redirect);
      }
    } catch (err: unknown) {
      setAuthError(
        getErrorMessage(
          err,
          'Could not verify the code. Enter the newest 6-digit code from your email.'
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (
    name: string,
    email: string,
    password: string
  ) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      await register(name, email, password);
      setPendingTwoFactorUserId(null);
      setModalOpen(false);
      
      // Handle redirect after successful registration
      if (redirect) {
        router.push(redirect);
      }
    } catch (err: unknown) {
      setAuthError(
        getErrorMessage(
          err,
          'Could not create your account. Check the highlighted fields and try again.'
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async (credential: string) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await loginWithGoogle(credential);

      if (result.requires2FA) {
        setPendingTwoFactorUserId(result.userId);
        return;
      }

      setPendingTwoFactorUserId(null);
      setModalOpen(false);
    } catch (err: unknown) {
      setAuthError(
        getErrorMessage(
          err,
          'Google login did not finish. Close the Google popup and try again.'
        )
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setForgotSuccess(
        res.data?.data?.message ||
          'If an account with that email exists, a password reset link has been sent.'
      );
    } catch (err: unknown) {
      setForgotError(
        getErrorMessage(
          err,
          'Could not send the reset link. Check the email address and try again.'
        )
      );
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      router.push('/households');
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base">
      <Navbar onLoginClick={openLogin} onRegisterClick={openRegister} />
      <Hero onGetStarted={openRegister} />
      <Features />
      <HowItWorks />
      <CTASection onGetStarted={openRegister} />
      <Footer />

      <AuthModal
        isOpen={modalOpen}
        mode={modalMode}
        onClose={() => {
          setModalOpen(false);
          setPendingTwoFactorUserId(null);
          setAuthError(null);
        }}
        onSwitchMode={() => {
          setAuthError(null);
          setPendingTwoFactorUserId(null);
          setModalMode(modalMode === 'login' ? 'register' : 'login');
        }}
        onLogin={handleLogin}
        onVerifyTwoFactor={handleVerifyTwoFactor}
        onRegister={handleRegister}
        onGoogleCredential={handleGoogleAuth}
        onForgotPassword={openForgotPassword}
        error={authError}
        loading={authLoading}
        requiresTwoFactor={!!pendingTwoFactorUserId}
      />

      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onBackToLogin={() => {
          setForgotOpen(false);
          setForgotError(null);
          setForgotSuccess(null);
          openLogin();
        }}
        onSubmit={handleForgotPassword}
        loading={forgotLoading}
        error={forgotError}
        successMessage={forgotSuccess}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}

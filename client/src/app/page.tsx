'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/modals/AuthModal';
import ForgotPasswordModal from '@/components/modals/ForgotPasswordModal';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

function LandingPageContent() {
  const { user, login, verifyTwoFactorLogin, register } = useAuth();

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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setAuthError(
        error.response?.data?.error?.message || 'Login failed. Please try again.'
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setAuthError(
        error.response?.data?.error?.message || 'Verification failed. Please try again.'
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setAuthError(
        error.response?.data?.error?.message ||
          'Registration failed. Please try again.'
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
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setForgotError(
        error.response?.data?.error?.message ||
          'Could not send reset link. Please try again.'
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
  return <LandingPageContent />;
}
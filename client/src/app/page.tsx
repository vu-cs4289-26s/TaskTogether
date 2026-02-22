'use client';

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/modals/AuthModal';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';

function LandingPageContent() {
  const { user, login, register, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();

  const openLogin = () => {
    setAuthError(null);
    setModalMode('login');
    setModalOpen(true);
  };

  const openRegister = () => {
    setAuthError(null);
    setModalMode('register');
    setModalOpen(true);
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await login(email, password);
      setModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setAuthError(
        error.response?.data?.error?.message || 'Login failed. Please try again.'
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

  useEffect(() => {
    if (user) {
      router.push('/households');
    }
  }, [user, router]);

  if (user) {
    return null; // Or a loading spinner while redirecting
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
        onClose={() => setModalOpen(false)}
        onSwitchMode={() => {
          setAuthError(null);
          setModalMode(modalMode === 'login' ? 'register' : 'login');
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={authError}
        loading={authLoading}
      />
    </div>
  );
}

export default function Home() {
  return <LandingPageContent />;
}

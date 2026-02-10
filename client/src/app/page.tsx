'use client';

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

function LandingPageContent() {
  const { user, login, register, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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

  // If user is logged in, show a simple authenticated state
  if (user) {
    return (
      <div className="min-h-screen bg-base">
        <nav className="bg-surface shadow-sm sticky top-0 z-50">
          <div className="max-w-[1200px] mx-auto flex justify-between items-center px-6 py-4">
            <div className="font-heading text-xl font-bold text-sage">
              TaskTogether
            </div>
            <div className="flex items-center gap-4">
              <span className="text-text-secondary">
                Welcome, {user.name}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-sm border border-divider text-text-primary font-medium transition-all hover:bg-base hover:border-sage"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
        <div className="max-w-[1200px] mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">
            Welcome to TaskTogether
          </h1>
          <p className="text-text-secondary text-lg">
            Dashboard coming soon. You are logged in as {user.email}.
          </p>
        </div>
      </div>
    );
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
  return (
    <AuthProvider>
      <LandingPageContent />
    </AuthProvider>
  );
}

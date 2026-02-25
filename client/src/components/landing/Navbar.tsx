'use client';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 font-heading text-xl font-bold text-sage">
          TaskTogether
        </div>
        <div className="flex gap-2 sm:gap-4">
          <button
            onClick={onLoginClick}
            style={{ color: '#5a7c5e' }}
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-sm border border-divider font-medium text-sm sm:text-base transition-all hover:bg-base hover:border-sage"
          >
            Login
          </button>
          <button
            onClick={onRegisterClick}
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-sm bg-sage text-white font-medium text-sm sm:text-base transition-all hover:bg-sage-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(90,124,94,0.3)]"
          >
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

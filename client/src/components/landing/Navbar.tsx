'use client';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2 font-heading text-xl font-bold text-sage">
          TaskTogether
        </div>
        <div className="flex gap-4">
          <button
            onClick={onLoginClick}
            className="px-6 py-3 rounded-sm border border-divider text-text-primary font-medium text-base transition-all hover:bg-base hover:border-sage"
          >
            Login
          </button>
          <button
            onClick={onRegisterClick}
            className="px-6 py-3 rounded-sm bg-sage text-white font-medium text-base transition-all hover:bg-sage-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(90,124,94,0.3)]"
          >
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

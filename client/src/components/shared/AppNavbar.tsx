'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { listHouseholdsApi } from '@/lib/households.api';
import type { Household } from '@/types/households';

interface AppNavbarProps {
  userName?: string;
  userEmail?: string;
  userInitials?: string;
}

function computeInitials(name?: string) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '??';
  return trimmed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

export default function AppNavbar(props: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const userName = props.userName ?? user?.name ?? 'Unknown User';
  const userEmail = props.userEmail ?? user?.email ?? '';
  const userInitials = props.userInitials ?? computeInitials(userName);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [householdsDropdownOpen, setHouseholdsDropdownOpen] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);

  const dropdownRef = useRef<HTMLLIElement>(null);
  const householdsDropdownRef = useRef<HTMLLIElement>(null);

  // Detect current household from URL
  const householdMatch = pathname.match(/^\/households\/([^/]+)/);
  const currentHouseholdId = householdMatch?.[1] ?? null;
  const isOnHouseholdPage = !!currentHouseholdId;

  // Fetch households on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listHouseholdsApi();
        if (!cancelled) setHouseholds(data);
      } catch {
        // gracefully handle — empty list
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setHouseholdsDropdownOpen(false);
  }, [pathname]);

  // Click-outside handler for both dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (householdsDropdownRef.current && !householdsDropdownRef.current.contains(e.target as Node)) {
        setHouseholdsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-4 py-3 md:px-6 md:py-4">
        <Link href="/households" className="font-extrabold text-2xl text-sage">
          TaskTogether
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-6 items-center list-none">
          {/* Households dropdown */}
          <li className="relative" ref={householdsDropdownRef}>
            <button
              type="button"
              onClick={() => setHouseholdsDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 no-underline font-medium transition-colors hover:text-sage ${
                pathname.startsWith('/households')
                  ? 'text-sage font-semibold'
                  : 'text-text-primary'
              }`}
            >
              Households
              <ChevronDown
                className={`w-4 h-4 transition-transform ${householdsDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {householdsDropdownOpen && (
              <div className="absolute left-0 mt-2 min-w-[220px] bg-surface border border-divider rounded-md shadow-md overflow-hidden z-50">
                <Link
                  href="/households"
                  className={`block px-4 py-2.5 no-underline font-medium transition-colors hover:bg-base ${
                    pathname === '/households'
                      ? 'text-sage bg-soft-highlight'
                      : 'text-text-primary'
                  }`}
                >
                  All Households
                </Link>

                {households.length > 0 && (
                  <>
                    <div className="h-px bg-divider" />
                    {households.map((h) => (
                      <Link
                        key={h.id}
                        href={`/households/${h.id}`}
                        className={`block px-4 py-2.5 no-underline transition-colors hover:bg-base ${
                          currentHouseholdId === h.id
                            ? 'text-sage font-semibold bg-soft-highlight'
                            : 'text-text-primary'
                        }`}
                      >
                        {h.name}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </li>

          {/* Wiki link — always visible, passes household context if available */}
          <li>
            <Link
              href={currentHouseholdId ? `/wiki?household=${currentHouseholdId}` : '/wiki'}
              className={`no-underline font-medium transition-colors hover:text-sage ${
                pathname.startsWith('/wiki')
                  ? 'text-sage font-semibold'
                  : 'text-text-primary'
              }`}
            >
              Wiki
            </Link>
          </li>

          {/* User avatar dropdown */}
          <li className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center font-semibold cursor-pointer border-2 transition-all ${
                dropdownOpen ? 'border-sage scale-105' : 'border-divider hover:border-sage hover:scale-105'
              }`}
              title={userName}
            >
              {userInitials}
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 min-w-[200px] bg-surface border border-divider rounded-md shadow-md overflow-hidden z-50">
                <div className="p-4 border-b border-divider">
                  <div className="font-semibold text-[15px]">{userName}</div>
                  <div className="text-[13px] text-text-secondary">{userEmail}</div>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2 no-underline text-text-primary hover:bg-base transition-colors"
                >
                  <User className="w-[18px] h-[18px]" strokeWidth={2} />
                  View Profile
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 no-underline text-text-primary hover:bg-base transition-colors"
                >
                  <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                  Settings
                </Link>

                <div className="h-px bg-divider my-1" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-urgent hover:bg-base transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
                  Logout
                </button>
              </div>
            )}
          </li>
        </ul>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-sm text-text-primary hover:bg-base transition-colors"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-divider px-4 py-3 bg-surface">
          <ul className="flex flex-col gap-1 list-none">
            {/* Households section */}
            <li className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Households
            </li>
            <li>
              <Link
                href="/households"
                className={`block py-3 px-3 rounded-sm no-underline font-medium transition-colors hover:bg-base ${
                  pathname === '/households'
                    ? 'text-sage bg-soft-highlight'
                    : 'text-text-primary'
                }`}
              >
                All Households
              </Link>
            </li>
            {households.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/households/${h.id}`}
                  className={`block py-3 px-3 rounded-sm no-underline transition-colors hover:bg-base ${
                    currentHouseholdId === h.id
                      ? 'text-sage font-semibold bg-soft-highlight'
                      : 'text-text-primary'
                  }`}
                >
                  {h.name}
                </Link>
              </li>
            ))}

            {/* Wiki — always visible, passes household context if available */}
            <li className="h-px bg-divider my-2" />
            <li>
              <Link
                href={currentHouseholdId ? `/wiki?household=${currentHouseholdId}` : '/wiki'}
                className={`block py-3 px-3 rounded-sm no-underline font-medium transition-colors hover:bg-base ${
                  pathname.startsWith('/wiki')
                    ? 'text-sage bg-soft-highlight'
                    : 'text-text-primary'
                }`}
              >
                Household Wiki
              </Link>
            </li>

            <li className="h-px bg-divider my-2" />

            {/* User info */}
            <li className="px-3 py-2">
              <div className="font-semibold text-[15px]">{userName}</div>
              <div className="text-[13px] text-text-secondary">{userEmail}</div>
            </li>

            <li>
              <Link
                href="/profile"
                className="flex items-center gap-2 py-3 px-3 rounded-sm no-underline text-text-primary hover:bg-base transition-colors"
              >
                <User className="w-[18px] h-[18px]" strokeWidth={2} />
                View Profile
              </Link>
            </li>

            <li>
              <Link
                href="/settings"
                className="flex items-center gap-2 py-3 px-3 rounded-sm no-underline text-text-primary hover:bg-base transition-colors"
              >
                <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                Settings
              </Link>
            </li>

            <li className="h-px bg-divider my-2" />

            <li>
              <button
                type="button"
                className="w-full flex items-center gap-2 py-3 px-3 rounded-sm text-left text-urgent hover:bg-base transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

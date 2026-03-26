'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { listHouseholdsApi } from '@/lib/households.api';
import type { Household } from '@/types/households';
import type { Notification } from '@/types/notifications';

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

/** Simple relative time formatter */
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Icon color per notification type */
function notifIcon(type: Notification['type']): string {
  switch (type) {
    case 'TASK_ASSIGNED':
    case 'TASK_COMPLETED':
    case 'TASK_UPCOMING':
      return 'bg-sage';
    case 'ISSUE_STATUS_CHANGED':
      return 'bg-urgent';
    case 'EVENT_UPCOMING':
      return 'bg-blue-500';
    default:
      return 'bg-sage';
  }
}

export default function AppNavbar(props: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const userName = props.userName ?? user?.name ?? 'Unknown User';
  const userEmail = props.userEmail ?? user?.email ?? '';
  const userInitials = props.userInitials ?? computeInitials(userName);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [householdsDropdownOpen, setHouseholdsDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);

  const dropdownRef = useRef<HTMLLIElement>(null);
  const householdsDropdownRef = useRef<HTMLLIElement>(null);
  const notifDropdownRef = useRef<HTMLLIElement>(null);

  // Detect current household from URL
  const householdMatch = pathname.match(/^\/households\/([^/]+)/);
  const currentHouseholdId = householdMatch?.[1] ?? null;

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
    setNotifDropdownOpen(false);
    setMobileNotifOpen(false);
  }, [pathname]);

  // Click-outside handler for all dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (householdsDropdownRef.current && !householdsDropdownRef.current.contains(e.target as Node)) {
        setHouseholdsDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.push('/');
  }

  function handleNotifClick(n: Notification) {
    if (!n.isRead) {
      markRead(n.householdId, n.id);
    }
  }

  const recentNotifications = notifications.slice(0, 15);

  const notifList = (
    <div className="flex flex-col">
      {recentNotifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-text-secondary text-sm">
          No notifications yet
        </div>
      ) : (
        recentNotifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => handleNotifClick(n)}
            className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-base border-b border-divider last:border-b-0 ${
              !n.isRead ? 'bg-soft-highlight' : ''
            }`}
          >
            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? notifIcon(n.type) : 'bg-transparent'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary leading-snug break-words">{n.message}</p>
              <p className="text-xs text-text-secondary mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );

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
              {currentHouseholdId
                ? households.find((h) => h.id === currentHouseholdId)?.name ?? 'Households'
                : 'All Households'}
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

          {/* Notifications bell */}
          <li className="relative" ref={notifDropdownRef}>
            <button
              type="button"
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative p-1.5 rounded-md text-text-primary hover:text-sage hover:bg-base transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-urgent text-white text-[11px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[360px] max-h-[420px] bg-surface border border-divider rounded-md shadow-md overflow-hidden z-50 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
                  <h3 className="font-semibold text-[15px] text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      className="text-xs text-sage font-medium hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifList}
                </div>
              </div>
            )}
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

        {/* Mobile hamburger + bell */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            className="relative p-2 rounded-sm text-text-primary hover:bg-base transition-colors"
            onClick={() => { setMobileNotifOpen((prev) => !prev); setMobileMenuOpen(false); }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-urgent text-white text-[10px] font-bold px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="p-2 rounded-sm text-text-primary hover:bg-base transition-colors"
            onClick={() => { setMobileMenuOpen((prev) => !prev); setMobileNotifOpen(false); }}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile notifications panel */}
      {mobileNotifOpen && (
        <div className="md:hidden border-t border-divider bg-surface max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
            <h3 className="font-semibold text-[15px] text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-sage font-medium hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          {notifList}
        </div>
      )}

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

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { useCurrentUser } from '@/hook/currentUser';
import { clearMockLogin } from '@/lib/mockAuth';

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
  const { user } = useCurrentUser();

  const userName = props.userName ?? user?.name ?? 'Unknown User';
  const userEmail = props.userEmail ?? user?.email ?? '';
  const userInitials = props.userInitials ?? computeInitials(userName);

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    clearMockLogin();

    router.push('/');
    router.refresh();
  }

  const navLinks = [
    { href: '/households', label: 'My Households' },
    { href: '/wiki', label: 'Household Wiki' },
  ];

  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6 py-4">
        <Link href="/households" className="font-extrabold text-2xl font-bold text-sage">
          TaskTogether
        </Link>

        <ul className="flex gap-6 items-center list-none">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`no-underline font-medium transition-colors hover:text-sage ${
                  pathname.startsWith(link.href)
                    ? 'text-sage font-semibold'
                    : 'text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}

          <li className="relative group">
            <div
              className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center font-semibold cursor-pointer border-2 border-divider transition-all group-hover:border-sage group-hover:scale-105"
              title={userName}
            >
              {userInitials}
            </div>

            <div className="absolute right-0 mt-2 min-w-[200px] bg-surface border border-divider rounded-md shadow-md overflow-hidden opacity-0 invisible translate-y-[-8px] transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
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
          </li>
        </ul>
      </div>
    </nav>
  );
}
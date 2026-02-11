'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppNavbarProps {
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
}

export default function AppNavbar({ userName = 'Jordan Davis', userInitials = 'JD', onLogout }: AppNavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/households', label: 'My Households' },
    { href: '/profile', label: 'Profile' },
    { href: '/messages', label: 'Messages' },
  ];

  return (
    <nav className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6 py-4">
        <Link href="/households" className="font-heading text-xl font-bold text-sage">
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
          <li>
            <div
              className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center font-semibold cursor-pointer border-2 border-divider"
              title={userName}
              onClick={onLogout}
            >
              {userInitials}
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide bottom nav on onboarding
  const isOnboarding = pathname === '/onboarding';

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <main className="flex-1 pb-20">{children}</main>

      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-light/90 backdrop-blur-xl border-t border-cream/5">
          <div className="flex items-center justify-around max-w-lg mx-auto py-2">
            <NavItem
              href="/swipe"
              label="Entdecken"
              isActive={pathname === '/swipe'}
              icon={<FlameNavIcon active={pathname === '/swipe'} />}
            />
            <NavItem
              href="/likes"
              label="Matches"
              isActive={pathname.startsWith('/likes')}
              icon={<HeartNavIcon active={pathname.startsWith('/likes')} />}
            />
            <NavItem
              href="/settings"
              label="Profil"
              isActive={pathname === '/settings'}
              icon={<UserNavIcon active={pathname === '/settings'} />}
            />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({
  href,
  label,
  isActive,
  icon,
}: {
  href: string;
  label: string;
  isActive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
        isActive ? 'text-coral' : 'text-cream/40 hover:text-cream/60'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function FlameNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 5 9 5 14C5 17.87 8.13 21 12 21C15.87 21 19 17.87 19 14C19 9 12 2 12 2Z"
        fill={active ? '#E8627C' : 'currentColor'}
        opacity={active ? 1 : 0.4}
      />
      {active && (
        <path
          d="M12 21C13.66 21 15 19.66 15 18C15 15.5 12 10 12 10C12 10 9 15.5 9 18C9 19.66 10.34 21 12 21Z"
          fill="#F5C842"
          opacity="0.8"
        />
      )}
    </svg>
  );
}

function HeartNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#E8627C' : 'none'} stroke={active ? '#E8627C' : 'currentColor'} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function UserNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#E8627C' : 'currentColor'} strokeWidth="2" opacity={active ? 1 : 0.4}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

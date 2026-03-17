'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { borderTop, borderBottom } from '@/lib/ascii';

const navItems = [
  { href: '/', label: 'HOME' },
  { href: '/tournaments', label: 'TOURNAMENTS' },
  { href: '/history', label: 'HISTORY' },
  { href: '/rankings', label: 'RANKINGS' },
  { href: '/about', label: 'ABOUT' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="font-mono text-sm mb-4">
      <div className="text-[var(--border)]">
        {borderTop()}
      </div>
      <div className="text-[var(--border)]">
        │<span className="inline-block w-[64ch] overflow-hidden">
          {' '}
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <span key={item.href}>
                <Link
                  href={item.href}
                  className={`hover:text-[var(--green)] transition-colors ${
                    isActive
                      ? 'text-[var(--green)]'
                      : 'text-[var(--text)]'
                  }`}
                >
                  {isActive ? `[${item.label}]` : item.label}
                </Link>
                {index < navItems.length - 1 && (
                  <span className="text-[var(--text-dim)]"> │ </span>
                )}
              </span>
            );
          })}
        </span>│
      </div>
      <div className="text-[var(--border)]">
        {borderBottom()}
      </div>
    </nav>
  );
}

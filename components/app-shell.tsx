'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WalletConnect } from './WalletConnect';

const links = [
  { href: '/', label: 'Home' },
  { href: '/commit', label: 'Commit' },
  { href: '/reveal', label: 'Reveal' },
  { href: '/collection', label: 'Collection' },
  { href: '/dashboard', label: 'Dashboard' }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-border/70 bg-[#081423]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-black tracking-wide">BurnBounty</Link>
          <nav className="hidden gap-2 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white',
                  pathname === l.href && 'bg-white/10 text-white'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <WalletConnect />
        </div>
      </header>
      {children}
    </div>
  );
}


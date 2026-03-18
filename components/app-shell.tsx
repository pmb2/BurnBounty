'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WalletConnect } from './WalletConnect';
import { GameGuideModal } from './GameGuideModal';

const links = [
  { href: '/', label: 'Home' },
  { href: '/auth', label: 'Auth' },
  { href: '/commit', label: 'Commit' },
  { href: '/reveal', label: 'Reveal' },
  { href: '/collection', label: 'Collection' },
  { href: '/trading', label: 'Trading' },
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
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/70 bg-[#0d1118]/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <Link href="/" className="rounded-md border border-border px-3 py-2 text-xs text-zinc-200">Home</Link>
          <Link href="/auth" className="rounded-md border border-border px-3 py-2 text-xs text-zinc-200">Auth</Link>
          <Link href="/commit" className="rounded-md border border-border px-3 py-2 text-xs text-zinc-200">Commit</Link>
          <Link href="/trading" className="rounded-md border border-border px-3 py-2 text-xs text-zinc-200">Trade</Link>
          <GameGuideModal variant="bottom-nav" />
        </div>
      </nav>
    </div>
  );
}


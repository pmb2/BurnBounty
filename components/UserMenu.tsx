'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type MeResponse = {
  ok: boolean;
  user: { id: string; profile?: { displayName?: string; avatarUrl?: string; rankLabel?: string } };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'H';
}

export function UserMenu() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => (res.ok ? ((await res.json()) as MeResponse) : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null));
  }, []);

  const name = useMemo(
    () => session?.user?.profile?.displayName || 'Hunter',
    [session?.user?.profile?.displayName]
  );
  const rank = session?.user?.profile?.rankLabel || 'Greenhorn';
  const avatar = session?.user?.profile?.avatarUrl || '';

  if (!session?.ok) {
    return <Link href="/auth"><Button size="sm">Sign In</Button></Link>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-left text-xs"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1e293b] text-amber-200">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <span className="hidden sm:block">
          <span className="block max-w-32 truncate font-semibold text-zinc-100">{name}</span>
          <span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">{rank}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-border/70 bg-[#0c121b] p-2 shadow-2xl">
          <Link href="/dashboard?tab=settings" className="block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/5">
            Open Settings
          </Link>
          <Link href="/dashboard?tab=inventory" className="block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/5">
            Inventory
          </Link>
          <Link href="/dashboard?tab=play" className="block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-white/5">
            Play
          </Link>
          <button
            type="button"
            className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
              setOpen(false);
              setSession(null);
              window.location.href = '/auth';
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

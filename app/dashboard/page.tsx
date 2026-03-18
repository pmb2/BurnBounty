'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [redeemed, setRedeemed] = useState(0);
  const [house, setHouse] = useState(0);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const r = Number(localStorage.getItem('burnbounty.totalRedeemed') || '0');
    const h = Number(localStorage.getItem('burnbounty.houseProfit') || '0');
    setRedeemed(r);
    setHouse(h);

    fetch('/api/profiles')
      .then((r) => r.json())
      .then((json) => setProfiles((json.profiles || []).slice(0, 5)))
      .catch(() => setProfiles([]));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Bounty Ledger</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm uppercase tracking-[0.18em] text-zinc-400">Total Bounties Claimed</h2>
          <p className="mt-3 text-4xl font-bold">{(redeemed / 1e8).toFixed(8)} BCH</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm uppercase tracking-[0.18em] text-zinc-400">House Pool (20%)</h2>
          <p className="mt-3 text-4xl font-bold">{(house / 1e8).toFixed(8)} BCH</p>
        </article>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm uppercase tracking-[0.18em] text-zinc-400">Other Hunters</h2>
        <div className="mt-3 space-y-2">
          {profiles.map((p) => (
            <Link key={p.address} href={`/profile/${encodeURIComponent(p.address)}`} className="block rounded border border-border/70 bg-black/20 px-3 py-2 text-sm hover:bg-black/30">
              <p className="font-semibold">{p.display_name}</p>
              <p className="text-xs text-zinc-400">{p.address}</p>
            </Link>
          ))}
          {profiles.length === 0 && <p className="text-zinc-500">No hunters discovered yet.</p>}
        </div>
      </section>
    </main>
  );
}

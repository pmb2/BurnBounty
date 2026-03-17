'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [redeemed, setRedeemed] = useState(0);
  const [house, setHouse] = useState(0);

  useEffect(() => {
    const r = Number(localStorage.getItem('burnbounty.totalRedeemed') || '0');
    const h = Number(localStorage.getItem('burnbounty.houseProfit') || '0');
    setRedeemed(r);
    setHouse(h);
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
    </main>
  );
}

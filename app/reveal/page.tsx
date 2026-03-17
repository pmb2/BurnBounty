'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import type { RevealPackResult } from '@/types/cards';

export default function RevealPage() {
  const [stash, setStash] = useState<any>(null);
  const [result, setResult] = useState<RevealPackResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('cashborders.pendingReveal');
    setStash(raw ? JSON.parse(raw) : null);
  }, []);

  async function revealPack() {
    if (!stash) return;
    setLoading(true);
    try {
      const wif = localStorage.getItem('cashborders.wif') || '';
      const res = await fetch('/api/reveal-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wif,
          userSeed: stash.userSeed,
          nonce: stash.nonce,
          pending: stash.pending
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reveal failed');
      setResult(json);

      const prior = localStorage.getItem('cashborders.collection');
      const cards = prior ? JSON.parse(prior) : [];
      localStorage.setItem('cashborders.collection', JSON.stringify([...cards, ...json.cards]));
      localStorage.removeItem('cashborders.pendingReveal');
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => result?.cards ?? [], [result]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reveal Pack</h1>
        <p className="text-zinc-300">Step 2 of 2: reveal seed + nonce and open your 5 cards.</p>
      </div>

      {!stash && !result && (
        <div className="rounded-2xl border border-border bg-card p-5 text-zinc-300">No pending commit found. Start at /commit.</div>
      )}

      {stash && !result && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-zinc-300">Commit txid: {stash.pending.commitTxid}</p>
          <p className="text-sm text-zinc-300">Commitment hash: {stash.pending.commitmentHash}</p>
          <Button className="mt-4" onClick={revealPack} disabled={loading}>{loading ? 'Revealing...' : 'Reveal & Open'}</Button>
        </div>
      )}

      {result && (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-xs text-zinc-300">
            <p>Reveal txid: {result.revealTxid}</p>
            <p>Entropy root: {result.entropyRoot}</p>
            <p>Seed reveal: {result.seedReveal.userSeed} | nonce: {result.seedReveal.nonce}</p>
            <p>Block hashes: N={result.blockHashes.n} N-1={result.blockHashes.n1} N-2={result.blockHashes.n2}</p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card, i) => (
              <motion.div
                key={card.nftId}
                initial={{ opacity: 0, y: 24, rotateY: -90 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: i * 0.12, duration: 0.35 }}
              >
                <Card card={card} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

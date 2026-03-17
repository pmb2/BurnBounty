'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { PackReveal3D } from '@/components/PackReveal3D';
import { MagicParticles } from '@/components/MagicParticles';
import type { RevealPackResult } from '@/types/cards';

export default function RevealPage() {
  const [stash, setStash] = useState<any>(null);
  const [result, setResult] = useState<RevealPackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const revealContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('burnbounty.pendingReveal');
    setStash(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => {
    if (!result || !revealContainerRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(revealContainerRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55 });
    tl.to({}, { duration: 0.35, onComplete: () => setShowCards(true) });

    const hasRare = result.cards.some((c) => c.tier === 'Gold' || c.tier === 'Diamond');
    const hasDiamond = result.cards.some((c) => c.tier === 'Diamond');

    if (hasRare) {
      confetti({ particleCount: hasDiamond ? 220 : 120, spread: 95, origin: { y: 0.58 } });
      toast.success(hasDiamond ? 'Diamond pull detected' : 'Rare pull detected', {
        description: hasDiamond ? 'Legendary card revealed with premium border.' : 'Gold tier card revealed.'
      });
    } else {
      toast.success('Pack revealed', { description: 'All five cards were generated deterministically.' });
    }
  }, [result]);

  async function revealPack() {
    if (!stash) return;
    setLoading(true);
    try {
      const wif = localStorage.getItem('burnbounty.wif') || '';
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

      const prior = localStorage.getItem('burnbounty.collection');
      const cards = prior ? JSON.parse(prior) : [];
      localStorage.setItem('burnbounty.collection', JSON.stringify([...cards, ...json.cards]));
      localStorage.removeItem('burnbounty.pendingReveal');
    } catch (err: any) {
      toast.error('Reveal failed', { description: err.message || 'Unknown reveal error' });
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => result?.cards ?? [], [result]);

  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
      <MagicParticles />
      <div className="relative mb-6">
        <h1 className="text-3xl font-bold">Reveal Bounty List</h1>
        <p className="text-zinc-300">Step 2 of 2: reveal seed + nonce and unlock your 5 wanted cards.</p>
      </div>

      <PackReveal3D cards={cards} revealed={!!result} />

      {!stash && !result && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-zinc-300">No pending commit found. Start at /commit.</div>
      )}

      {stash && !result && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-zinc-300">Commit txid: {stash.pending.commitTxid}</p>
          <p className="text-sm text-zinc-300">Commitment hash: {stash.pending.commitmentHash}</p>
          <Button className="mt-4" onClick={revealPack} disabled={loading}>{loading ? 'Revealing...' : 'Reveal & Hunt'}</Button>
        </div>
      )}

      {result && (
        <div ref={revealContainerRef} className="mt-6">
          <div className="rounded-2xl border border-cyan-300/30 bg-card/90 p-5 text-xs text-zinc-300 backdrop-blur">
            <p>Reveal txid: {result.revealTxid}</p>
            <p>Entropy root: {result.entropyRoot}</p>
            <p>Seed reveal: {result.seedReveal.userSeed} | nonce: {result.seedReveal.nonce}</p>
            <p>Block hashes: N={result.blockHashes.n} N-1={result.blockHashes.n1} N-2={result.blockHashes.n2}</p>
          </div>

          {showCards && (
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
          )}
        </div>
      )}
    </main>
  );
}


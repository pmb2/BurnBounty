'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';
import { BountyWorldScene } from '@/components/BountyWorldScene';
import { Card } from '@/components/Card';
import { MagicParticles } from '@/components/MagicParticles';
import { PackReveal3D } from '@/components/PackReveal3D';
import { WalletAuthPanel } from '@/components/WalletAuthPanel';
import { Button } from '@/components/ui/button';
import type { CommitPackResult, PackSeries, RevealPackResult } from '@/types/cards';
import type { WalletRecord } from '@/types/auth';
import { isLikelyTestnetWif, maskWif } from '@/lib/wif';

const SERIES_OPTIONS: Array<{ value: PackSeries; label: string; priceSats: number; perk: string }> = [
  { value: 'GENESIS_BETA', label: 'Genesis Beta (Series 1)', priceSats: 5_000_000, perk: 'Min drift +5/wk' },
  { value: 'FOUNDER_EDITION', label: 'Founder Edition (Series 2)', priceSats: 2_000_000, perk: 'Min drift +1/wk' },
  { value: 'NORMAL', label: 'Normal', priceSats: 800_000, perk: 'Standard drift rules' }
];

type PlayStep = 'access' | 'commit' | 'reveal' | 'done';
type PendingRevealStash = {
  userSeed: string;
  nonce: string;
  pending: CommitPackResult;
};

type MeResponse = {
  ok: boolean;
  user: { id: string; profile?: { displayName?: string } };
  wallets: WalletRecord[];
  primaryWallet?: WalletRecord | null;
};

async function hash256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const first = await crypto.subtle.digest('SHA-256', bytes);
  const second = await crypto.subtle.digest('SHA-256', first);
  return Array.from(new Uint8Array(second)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function PlayPage() {
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get('step');

  const [session, setSession] = useState<MeResponse | null>(null);
  const [step, setStep] = useState<PlayStep>('access');

  const [wifInput, setWifInput] = useState('');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [series, setSeries] = useState<PackSeries>('NORMAL');
  const [commitLoading, setCommitLoading] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [stash, setStash] = useState<PendingRevealStash | null>(null);
  const [revealResult, setRevealResult] = useState<RevealPackResult | null>(null);
  const [showCards, setShowCards] = useState(false);
  const revealContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => (res.ok ? ((await res.json()) as MeResponse) : null))
      .then((me) => setSession(me))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    const savedWif = localStorage.getItem('burnbounty.wif') || '';
    setConnectedAddress(savedWif ? maskWif(savedWif) : '');
    const rawStash = localStorage.getItem('burnbounty.pendingReveal');
    const parsedStash = rawStash ? (JSON.parse(rawStash) as PendingRevealStash) : null;
    setStash(parsedStash);

    if (requestedStep === 'reveal' && parsedStash) {
      setStep('reveal');
      return;
    }

    if (requestedStep === 'commit') {
      setStep('commit');
      return;
    }

    if (parsedStash) {
      setStep('reveal');
      return;
    }

    if (session?.ok) {
      setStep('commit');
      return;
    }

    setStep('access');
  }, [requestedStep, session?.ok]);

  useEffect(() => {
    if (!revealResult || !revealContainerRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(revealContainerRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55 });
    tl.to({}, { duration: 0.35, onComplete: () => setShowCards(true) });

    const hasRare = revealResult.cards.some((c) => c.tier === 'Gold' || c.tier === 'Diamond');
    const hasDiamond = revealResult.cards.some((c) => c.tier === 'Diamond');
    if (hasRare) {
      confetti({ particleCount: hasDiamond ? 220 : 120, spread: 95, origin: { y: 0.58 } });
    }
  }, [revealResult]);

  async function connectGameplayWif() {
    const normalized = wifInput.trim();
    if (!normalized) {
      toast.error('Missing WIF', { description: 'Paste a chipnet/testnet WIF to continue.' });
      return;
    }
    if (!isLikelyTestnetWif(normalized)) {
      toast.error('Invalid WIF', { description: 'The provided key could not be parsed.' });
      return;
    }
    localStorage.setItem('burnbounty.wif', normalized);
    setConnectedAddress(maskWif(normalized));
    setWifInput('');
    toast.success('Gameplay key connected', { description: 'Used for chipnet gameplay transactions only.' });
  }

  async function commitPack() {
    setCommitLoading(true);
    try {
      const wif = (localStorage.getItem('burnbounty.wif') || '').trim();
      if (!wif) throw new Error('Chipnet WIF required. Connect gameplay key first.');

      const userSeed = `${crypto.randomUUID()}:${Date.now()}`;
      const nonce = crypto.randomUUID().slice(0, 12);
      const commitmentHash = await hash256Hex(`${userSeed}:${nonce}`);

      const res = await fetch('/api/commit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wif, commitmentHash, series })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Commit failed');

      const nextStash: PendingRevealStash = { userSeed, nonce, pending: json };
      localStorage.setItem('burnbounty.pendingReveal', JSON.stringify(nextStash));
      setStash(nextStash);
      setStep('reveal');
      toast.success('Pack committed', { description: `Reveal before block ${json.revealDeadline}.` });
    } catch (err: any) {
      toast.error('Commit failed', { description: err.message || 'Unknown commit error' });
    } finally {
      setCommitLoading(false);
    }
  }

  async function revealPack() {
    if (!stash) return;
    setRevealLoading(true);
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

      setRevealResult(json as RevealPackResult);
      setStep('done');
      localStorage.removeItem('burnbounty.pendingReveal');
      setStash(null);

      const prior = localStorage.getItem('burnbounty.collection');
      const cards = prior ? JSON.parse(prior) : [];
      localStorage.setItem('burnbounty.collection', JSON.stringify([...cards, ...json.cards]));

      toast.success('Bounty reveal complete', { description: 'Cards added to your armory.' });
    } catch (err: any) {
      toast.error('Reveal failed', { description: err.message || 'Unknown reveal error' });
    } finally {
      setRevealLoading(false);
    }
  }

  const cards = useMemo(() => revealResult?.cards ?? [], [revealResult]);

  const stepOrder: Array<{ key: PlayStep; label: string }> = [
    { key: 'access', label: 'Access' },
    { key: 'commit', label: 'Commit' },
    { key: 'reveal', label: 'Reveal' },
    { key: 'done', label: 'Armory' }
  ];

  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
      <MagicParticles />
      <section className="bounty-board-bg relative mb-6 rounded-3xl px-6 py-7">
        <ActiveBoardBackdrop density="high" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Play BurnBounty</h1>
          <p className="text-zinc-300">
            One flow: access your hunter profile, commit a pack, reveal your cards, then move to armory actions.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {stepOrder.map((s) => {
              const active = s.key === step;
              return (
                <div
                  key={s.key}
                  className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.16em] ${active ? 'border-emerald-300/60 bg-emerald-500/20 text-emerald-100' : 'border-white/20 bg-black/25 text-zinc-300'}`}
                >
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <BountyWorldScene />
      </section>

      {step === 'access' && (
        <section className="bounty-panel relative rounded-2xl p-4">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <WalletAuthPanel defaultMode="embedded" nextPath="/play?step=commit" />
          </div>
        </section>
      )}

      {(step === 'commit' || step === 'reveal' || step === 'done') && (
        <section className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold">Commit Pack</h2>
            <p className="mt-1 text-sm text-zinc-300">Lock your bounty drop with a one-time commit transaction.</p>

            <div className="mt-4 mb-4 space-y-2">
              <label htmlFor="series" className="text-xs uppercase tracking-[0.16em] text-zinc-400">Series</label>
              <select
                id="series"
                value={series}
                onChange={(e) => setSeries(e.target.value as PackSeries)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm md:max-w-md"
              >
                {SERIES_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-amber-200">
                {SERIES_OPTIONS.find((s) => s.value === series)?.perk} • Price {(Number(SERIES_OPTIONS.find((s) => s.value === series)?.priceSats || 0) / 1e8).toFixed(8)} BCH
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={wifInput}
                onChange={(e) => setWifInput(e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm md:max-w-md"
                placeholder="Paste chipnet/testnet WIF (gameplay only)"
              />
              <Button variant="outline" onClick={connectGameplayWif}>Connect Gameplay Key</Button>
              <Button onClick={commitPack} disabled={commitLoading || !!stash}>
                {commitLoading ? 'Committing...' : `Lock Bounty Pack (${(Number(SERIES_OPTIONS.find((s) => s.value === series)?.priceSats || 0) / 1e8).toFixed(8)} BCH)`}
              </Button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">{connectedAddress || 'No gameplay key connected yet.'}</p>
          </div>
        </section>
      )}

      {(step === 'reveal' || step === 'done') && (
        <section className="mt-6">
          <PackReveal3D cards={cards} revealed={!!revealResult} />

          {stash && !revealResult && (
            <div className="bounty-paper mt-4 rounded-2xl p-5">
              <p className="text-sm text-zinc-300">Commit txid: {stash.pending.commitTxid}</p>
              <p className="text-sm text-zinc-300">Commitment hash: {stash.pending.commitmentHash}</p>
              <p className="text-sm text-zinc-300">Series: {stash.pending.series} • Pack price: {(stash.pending.packPriceSats / 1e8).toFixed(8)} BCH</p>
              <Button className="mt-4" onClick={revealPack} disabled={revealLoading}>
                {revealLoading ? 'Revealing...' : 'Reveal & Hunt'}
              </Button>
            </div>
          )}

          {revealResult && (
            <div ref={revealContainerRef} className="mt-6">
              <div className="bounty-paper rounded-2xl p-5 text-xs text-zinc-300 backdrop-blur">
                <p>Reveal txid: {revealResult.revealTxid}</p>
                <p>Entropy root: {revealResult.entropyRoot}</p>
                <p>Seed reveal: {revealResult.seedReveal.userSeed} | nonce: {revealResult.seedReveal.nonce}</p>
                <p>Block hashes: N={revealResult.blockHashes.n} N-1={revealResult.blockHashes.n1} N-2={revealResult.blockHashes.n2}</p>
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

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/armory?tab=inventory">
                  <Button>Go To Armory</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRevealResult(null);
                    setShowCards(false);
                    setStep('commit');
                  }}
                >
                  Hunt Another Pack
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

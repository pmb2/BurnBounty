'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';
import { BountyWorldScene } from '@/components/BountyWorldScene';
import { Card } from '@/components/Card';
import { ImmersiveAssetStatus } from '@/components/ImmersiveAssetStatus';
import { MagicParticles } from '@/components/MagicParticles';
import { WalletAuthPanel } from '@/components/WalletAuthPanel';
import { Button } from '@/components/ui/button';
import { normalizeCardAsset } from '@/lib/cards';
import type { WalletRecord } from '@/types/auth';
import type { CardAsset, Tier } from '@/types/cards';

const STORAGE_DECK_KEY = 'burnbounty.deck';
const STORAGE_STATS_KEY = 'burnbounty.hunterStats';
const STORAGE_HISTORY_KEY = 'burnbounty.matchHistory';
const STORAGE_COLLECTION_KEY = 'burnbounty.collection';
const MIN_MATCH_DECK = 5;
const MAX_DECK_SIZE = 10;

type MatchMode = 'ranked' | 'unranked';
type MatchOutcome = 'win' | 'loss' | 'draw';

type HunterStats = {
  elo: number;
  totalMatches: number;
  currentStreak: number;
  bestStreak: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
  unrankedWins: number;
  unrankedLosses: number;
  unrankedDraws: number;
};

type MatchRecord = {
  id: string;
  mode: MatchMode;
  outcome: MatchOutcome;
  deckPower: number;
  opponentPower: number;
  eloDelta: number;
  playedAt: string;
};

type MeResponse = {
  ok: boolean;
  user: { id: string; profile?: { displayName?: string } };
  wallets: WalletRecord[];
  primaryWallet?: WalletRecord | null;
};

const tierWeight: Record<Tier, number> = {
  Bronze: 1,
  Silver: 1.18,
  Gold: 1.42,
  Diamond: 1.7
};

function defaultStats(): HunterStats {
  return {
    elo: 1000,
    totalMatches: 0,
    currentStreak: 0,
    bestStreak: 0,
    rankedWins: 0,
    rankedLosses: 0,
    rankedDraws: 0,
    unrankedWins: 0,
    unrankedLosses: 0,
    unrankedDraws: 0
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function computeDeckPower(deckCards: CardAsset[]): number {
  if (deckCards.length === 0) return 0;
  const weighted = deckCards.reduce((sum, card) => sum + (card.faceValueSats / 1e8) * tierWeight[card.tier], 0);
  return Number((weighted / deckCards.length).toFixed(4));
}

function computeWinRate(stats: HunterStats) {
  if (stats.totalMatches === 0) return 0;
  const wins = stats.rankedWins + stats.unrankedWins;
  return (wins / stats.totalMatches) * 100;
}

function updateStatsWithResult(
  current: HunterStats,
  mode: MatchMode,
  outcome: MatchOutcome,
  eloDelta: number
): HunterStats {
  const next = { ...current };
  next.totalMatches += 1;

  if (mode === 'ranked') {
    if (outcome === 'win') next.rankedWins += 1;
    else if (outcome === 'loss') next.rankedLosses += 1;
    else next.rankedDraws += 1;
    next.elo = Math.max(0, next.elo + eloDelta);
  } else {
    if (outcome === 'win') next.unrankedWins += 1;
    else if (outcome === 'loss') next.unrankedLosses += 1;
    else next.unrankedDraws += 1;
  }

  if (outcome === 'win') {
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  } else if (outcome === 'loss') {
    next.currentStreak = 0;
  }

  return next;
}

function pickOutcome(deckPower: number, opponentPower: number): MatchOutcome {
  if (Math.abs(deckPower - opponentPower) < 0.08 && Math.random() < 0.15) return 'draw';
  const advantage = deckPower <= 0 ? -0.2 : (deckPower - opponentPower) / Math.max(deckPower, 0.25);
  const winChance = Math.min(0.78, Math.max(0.22, 0.5 + advantage * 0.32));
  const roll = Math.random();
  if (roll < winChance) return 'win';
  if (Math.abs(roll - winChance) < 0.04) return 'draw';
  return 'loss';
}

export default function PlayClientPage() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [stats, setStats] = useState<HunterStats>(defaultStats());
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [allCards, setAllCards] = useState<CardAsset[]>([]);
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [swapOutId, setSwapOutId] = useState<string>('');
  const [burnTotal, setBurnTotal] = useState(0);
  const [queueMode, setQueueMode] = useState<MatchMode>('unranked');
  const [queueing, setQueueing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const queueTimerRef = useRef<number | null>(null);

  const deckCards = useMemo(() => {
    const byId = new Map(allCards.map((card) => [card.nftId, card]));
    return deckIds.map((id) => byId.get(id)).filter(Boolean) as CardAsset[];
  }, [allCards, deckIds]);

  const inventoryCards = useMemo(
    () => allCards.filter((card) => !deckIds.includes(card.nftId)),
    [allCards, deckIds]
  );

  const deckPower = useMemo(() => computeDeckPower(deckCards), [deckCards]);
  const tierSplit = useMemo(() => {
    return deckCards.reduce(
      (acc, card) => {
        acc[card.tier] += 1;
        return acc;
      },
      { Bronze: 0, Silver: 0, Gold: 0, Diamond: 0 }
    );
  }, [deckCards]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => (res.ok ? ((await res.json()) as MeResponse) : null))
      .then((me) => setSession(me))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    const rawCollection = safeParse<Array<Partial<CardAsset>>>(localStorage.getItem(STORAGE_COLLECTION_KEY), []);
    const normalizedCards = rawCollection
      .map((entry) => {
        try {
          return normalizeCardAsset(entry);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as CardAsset[];
    setAllCards(normalizedCards);
    localStorage.setItem(STORAGE_COLLECTION_KEY, JSON.stringify(normalizedCards));

    const storedDeck = safeParse<string[]>(localStorage.getItem(STORAGE_DECK_KEY), []);
    const validDeck = storedDeck.filter((id) => normalizedCards.some((card) => card.nftId === id)).slice(0, MAX_DECK_SIZE);
    const initialDeck =
      validDeck.length > 0
        ? validDeck
        : normalizedCards.slice(0, Math.min(normalizedCards.length, MIN_MATCH_DECK)).map((card) => card.nftId);
    setDeckIds(initialDeck);
    setSwapOutId(initialDeck[0] || '');

    setStats(safeParse<HunterStats>(localStorage.getItem(STORAGE_STATS_KEY), defaultStats()));
    setHistory(safeParse<MatchRecord[]>(localStorage.getItem(STORAGE_HISTORY_KEY), []));
    setBurnTotal(Number(localStorage.getItem('burnbounty.totalRedeemed') || '0'));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_DECK_KEY, JSON.stringify(deckIds));
    if (!swapOutId && deckIds.length) setSwapOutId(deckIds[0]);
    if (swapOutId && !deckIds.includes(swapOutId)) setSwapOutId(deckIds[0] || '');
  }, [deckIds, hydrated, swapOutId]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats));
  }, [stats, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 25)));
  }, [history, hydrated]);

  useEffect(() => {
    return () => {
      if (queueTimerRef.current) window.clearTimeout(queueTimerRef.current);
    };
  }, []);

  function addOrSwapCard(card: CardAsset) {
    if (deckIds.includes(card.nftId)) return;

    if (deckIds.length < MAX_DECK_SIZE) {
      const next = [...deckIds, card.nftId];
      setDeckIds(next);
      if (!swapOutId) setSwapOutId(next[0] || '');
      toast.success('Card added to deck');
      return;
    }

    if (!swapOutId) {
      toast.error('Select a deck card to swap out first.');
      return;
    }

    const replaced = allCards.find((entry) => entry.nftId === swapOutId);
    setDeckIds(deckIds.map((id) => (id === swapOutId ? card.nftId : id)));
    setSwapOutId(card.nftId);
    toast.success('Deck card swapped', {
      description: replaced ? `${replaced.name} -> ${card.name}` : `${card.name} added`
    });
  }

  function removeFromDeck(cardId: string) {
    if (deckIds.length <= 1) {
      toast.error('Deck must contain at least one card.');
      return;
    }
    const next = deckIds.filter((id) => id !== cardId);
    setDeckIds(next);
    toast.success('Card moved back to inventory');
  }

  function queueMatch(mode: MatchMode) {
    if (queueing) return;
    if (deckCards.length < MIN_MATCH_DECK) {
      toast.error(`Deck too small`, { description: `Add at least ${MIN_MATCH_DECK} cards to queue for matches.` });
      return;
    }

    setQueueMode(mode);
    setQueueing(true);
    toast.message(mode === 'ranked' ? 'Queued ranked match...' : 'Queued unranked match...');

    const myPower = deckPower;
    const spread = 0.7 + Math.random() * 0.7;
    const opponentPower = Number((Math.max(0.2, myPower * spread)).toFixed(4));
    const outcome = pickOutcome(myPower, opponentPower);

    let eloDelta = 0;
    if (mode === 'ranked') {
      if (outcome === 'win') eloDelta = 18 + Math.floor(Math.random() * 8);
      if (outcome === 'loss') eloDelta = -(14 + Math.floor(Math.random() * 8));
      if (outcome === 'draw') eloDelta = Math.random() > 0.5 ? 2 : -2;
    }

    queueTimerRef.current = window.setTimeout(() => {
      const nextStats = updateStatsWithResult(stats, mode, outcome, eloDelta);
      setStats(nextStats);

      const match: MatchRecord = {
        id: crypto.randomUUID(),
        mode,
        outcome,
        deckPower: myPower,
        opponentPower,
        eloDelta,
        playedAt: new Date().toISOString()
      };
      setHistory((prev) => [match, ...prev].slice(0, 25));

      if (outcome === 'win') {
        toast.success(mode === 'ranked' ? `Ranked win (+${eloDelta} ELO)` : 'Unranked win');
      } else if (outcome === 'loss') {
        toast.error(mode === 'ranked' ? `Ranked loss (${eloDelta} ELO)` : 'Unranked loss');
      } else {
        toast.message(mode === 'ranked' ? `Ranked draw (${eloDelta >= 0 ? '+' : ''}${eloDelta} ELO)` : 'Unranked draw');
      }

      setQueueing(false);
      queueTimerRef.current = null;
    }, 2200);
  }

  return (
    <main className="relative mx-auto max-w-7xl px-6 py-10">
      <MagicParticles />

      <section className="bounty-board-bg relative mb-6 rounded-3xl px-6 py-7">
        <ActiveBoardBackdrop density="high" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Play Arena</h1>
          <p className="text-zinc-300">
            Build your active deck, swap cards from inventory, queue ranked/unranked matches, and track hunter performance.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-emerald-100">
              Deck Builder
            </div>
            <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-emerald-100">
              Match Queue
            </div>
            <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-emerald-100">
              Hunter Stats
            </div>
            <div className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-300">
              Inventory Swaps
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_320px]">
        <BountyWorldScene />
        <ImmersiveAssetStatus />
      </section>

      {!session?.ok && (
        <section className="bounty-panel relative mb-6 rounded-2xl p-4">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <WalletAuthPanel defaultMode="embedded" nextPath="/dashboard?tab=play" />
          </div>
        </section>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="bounty-paper rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">ELO</p>
          <p className="mt-1 text-3xl font-bold">{stats.elo}</p>
        </article>
        <article className="bounty-paper rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Total Matches</p>
          <p className="mt-1 text-3xl font-bold">{stats.totalMatches}</p>
        </article>
        <article className="bounty-paper rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Win Rate</p>
          <p className="mt-1 text-3xl font-bold">{computeWinRate(stats).toFixed(1)}%</p>
        </article>
        <article className="bounty-paper rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Current Streak</p>
          <p className="mt-1 text-3xl font-bold">{stats.currentStreak}</p>
        </article>
        <article className="bounty-paper rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Total BCH Burned</p>
          <p className="mt-1 text-2xl font-bold">{(burnTotal / 1e8).toFixed(4)}</p>
        </article>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Deck Builder</h2>
                <p className="text-sm text-zinc-300">
                  Deck size {deckCards.length}/{MAX_DECK_SIZE} • Minimum {MIN_MATCH_DECK} cards to queue
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                Power {deckPower.toFixed(3)} • B {tierSplit.Bronze} / S {tierSplit.Silver} / G {tierSplit.Gold} / D {tierSplit.Diamond}
              </div>
            </div>

            {deckCards.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deckCards.map((card) => (
                  <motion.div key={card.nftId} layout className="space-y-2">
                    <Card card={card} />
                    <div className="flex gap-2">
                      <Button
                        variant={swapOutId === card.nftId ? 'default' : 'outline'}
                        onClick={() => setSwapOutId(card.nftId)}
                        className="w-full"
                      >
                        {swapOutId === card.nftId ? 'Swap Target' : 'Set Swap Target'}
                      </Button>
                      <Button variant="outline" onClick={() => removeFromDeck(card.nftId)} className="w-full">
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-black/30 p-4 text-sm text-zinc-300">
                No deck cards yet. Add cards from inventory below.
              </div>
            )}
          </div>
        </article>

        <article className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="medium" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold">Matchmaking</h2>
            <p className="text-sm text-zinc-300">Queue quick unranked runs or compete for ranked ELO.</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => queueMatch('unranked')}
                disabled={queueing}
                variant={queueMode === 'unranked' ? 'default' : 'outline'}
              >
                Queue Unranked
              </Button>
              <Button
                onClick={() => queueMatch('ranked')}
                disabled={queueing}
                variant={queueMode === 'ranked' ? 'default' : 'outline'}
              >
                Queue Ranked
              </Button>
            </div>

            {queueing && (
              <div className="mt-4 rounded-xl border border-emerald-300/50 bg-emerald-500/15 p-3 text-sm text-emerald-100">
                Searching {queueMode} match for deck power {deckPower.toFixed(3)}...
              </div>
            )}

            <div className="mt-5 space-y-2">
              <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Recent Matches</h3>
              {history.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded border border-border/60 bg-black/30 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-[0.12em] text-zinc-300">{item.mode}</span>
                    <span
                      className={
                        item.outcome === 'win'
                          ? 'text-emerald-300'
                          : item.outcome === 'loss'
                            ? 'text-red-300'
                            : 'text-amber-200'
                      }
                    >
                      {item.outcome.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-400">
                    Deck {item.deckPower.toFixed(3)} vs Opp {item.opponentPower.toFixed(3)}
                    {item.mode === 'ranked' ? ` • ELO ${item.eloDelta >= 0 ? '+' : ''}${item.eloDelta}` : ''}
                  </p>
                </div>
              ))}
              {history.length === 0 && <p className="text-xs text-zinc-500">No matches played yet.</p>}
            </div>
          </div>
        </article>
      </section>

      <section className="bounty-panel relative rounded-2xl p-5">
        <ActiveBoardBackdrop density="low" />
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Inventory To Deck Swaps</h2>
              <p className="text-sm text-zinc-300">
                Add cards directly, or replace the selected swap target when your deck is full.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-black/30 px-3 py-2 text-xs text-zinc-300">
              Swap target: {allCards.find((card) => card.nftId === swapOutId)?.name || 'None selected'}
            </div>
          </div>

          {inventoryCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {inventoryCards.map((card) => (
                <div key={card.nftId} className="space-y-2">
                  <Card card={card} />
                  <Button onClick={() => addOrSwapCard(card)} className="w-full">
                    {deckCards.length >= MAX_DECK_SIZE ? 'Swap Into Deck' : 'Add To Deck'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-black/30 p-4 text-sm text-zinc-300">
              No inventory cards available for swaps. Open more packs or move cards out of your deck.
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard?tab=inventory">
          <Button variant="outline">Open Armory</Button>
        </Link>
        <Link href="/dashboard?tab=market">
          <Button variant="outline">Open Market</Button>
        </Link>
      </div>
    </main>
  );
}

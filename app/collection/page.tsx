'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import type { CardAsset } from '@/types/cards';
import { toast } from 'sonner';

type SortOption =
  | 'newest'
  | 'oldest'
  | 'value-desc'
  | 'value-asc'
  | 'tier-desc'
  | 'tier-asc'
  | 'name-asc'
  | 'name-desc';

const tierRank: Record<CardAsset['tier'], number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamond: 4
};

export default function CollectionPage() {
  const [cards, setCards] = useState<CardAsset[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    const raw = localStorage.getItem('burnbounty.collection');
    setCards(raw ? JSON.parse(raw) : []);
  }, []);

  async function redeem(card: CardAsset) {
    setRedeeming(card.nftId);
    try {
      const wif = localStorage.getItem('burnbounty.wif') || '';
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wif, card })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Redeem failed');

      const nextCards = cards.filter((c) => c.nftId !== card.nftId);
      setCards(nextCards);
      localStorage.setItem('burnbounty.collection', JSON.stringify(nextCards));

      const prior = Number(localStorage.getItem('burnbounty.totalRedeemed') || '0');
      localStorage.setItem('burnbounty.totalRedeemed', String(prior + json.payout));
      const housePrior = Number(localStorage.getItem('burnbounty.houseProfit') || '0');
      localStorage.setItem('burnbounty.houseProfit', String(housePrior + json.houseCut));
      toast.success('Card redeemed', {
        description: `Payout ${(json.payout / 1e8).toFixed(8)} BCH, house ${(json.houseCut / 1e8).toFixed(8)} BCH • multiplier ${(Number(json.multiplierMilli || 1000) / 1000).toFixed(3)}x`
      });
    } catch (err: any) {
      toast.error('Redeem failed', { description: err.message || 'Unknown redeem error' });
    } finally {
      setRedeeming(null);
    }
  }

  const sortedCards = useMemo(() => {
    const list = [...cards];
    switch (sortBy) {
      case 'oldest':
        return list;
      case 'value-desc':
        return list.sort((a, b) => b.faceValueSats - a.faceValueSats);
      case 'value-asc':
        return list.sort((a, b) => a.faceValueSats - b.faceValueSats);
      case 'tier-desc':
        return list.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);
      case 'tier-asc':
        return list.sort((a, b) => tierRank[a.tier] - tierRank[b.tier]);
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
      default:
        return list.reverse();
    }
  }, [cards, sortBy]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hunter Collection</h1>
        <p className="text-zinc-300">Turn in any wanted card for an instant 80% BCH bounty payout.</p>
      </div>
      <div className="mb-6 flex items-center justify-end gap-3">
        <label htmlFor="collection-sort" className="text-xs uppercase tracking-[0.16em] text-zinc-400">
          Sort
        </label>
        <select
          id="collection-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-zinc-100"
        >
          <option value="newest">Newest Added</option>
          <option value="oldest">Oldest Added</option>
          <option value="value-desc">Face Value: High to Low</option>
          <option value="value-asc">Face Value: Low to High</option>
          <option value="tier-desc">Tier: Diamond to Bronze</option>
          <option value="tier-asc">Tier: Bronze to Diamond</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
        </select>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {sortedCards.map((card) => (
          <div key={card.nftId} className="space-y-3">
            <Card card={card} />
            <Button onClick={() => redeem(card)} disabled={redeeming === card.nftId} className="w-full">
              {redeeming === card.nftId ? 'Redeeming...' : `Burn for ${card.payoutBch.toFixed(8)} BCH`}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}


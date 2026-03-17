'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import type { CardAsset } from '@/types/cards';

export default function CollectionPage() {
  const [cards, setCards] = useState<CardAsset[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('cashborders.collection');
    setCards(raw ? JSON.parse(raw) : []);
  }, []);

  async function redeem(card: CardAsset) {
    setRedeeming(card.nftId);
    try {
      const wif = localStorage.getItem('cashborders.wif') || '';
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wif, card })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Redeem failed');

      const nextCards = cards.filter((c) => c.nftId !== card.nftId);
      setCards(nextCards);
      localStorage.setItem('cashborders.collection', JSON.stringify(nextCards));

      const prior = Number(localStorage.getItem('cashborders.totalRedeemed') || '0');
      localStorage.setItem('cashborders.totalRedeemed', String(prior + json.payout));
      const housePrior = Number(localStorage.getItem('cashborders.houseProfit') || '0');
      localStorage.setItem('cashborders.houseProfit', String(housePrior + json.houseCut));
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-zinc-300">Burn any card for instant 80% payout in BCH (chipnet).</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
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

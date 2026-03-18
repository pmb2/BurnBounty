'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TradingPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [cardId, setCardId] = useState('');
  const [price, setPrice] = useState('100000');
  const [note, setNote] = useState('');

  async function load() {
    const res = await fetch('/api/trading/listings');
    const json = await res.json();
    setListings(json.listings || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createListing() {
    try {
      const seller = localStorage.getItem('burnbounty.auth.address') || localStorage.getItem('burnbounty.wif') || 'demo-seller';
      const res = await fetch('/api/trading/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_address: seller, card_id: cardId, price_sats: Number(price), note })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create listing failed');
      toast.success('Listing created');
      setCardId('');
      setNote('');
      await load();
    } catch (err: any) {
      toast.error('Listing failed', { description: err.message || 'Unknown error' });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Trading Post</h1>
      <p className="mt-2 text-zinc-300">Create off-chain listings with on-chain settlement via Escrow covenant.</p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Create Listing</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input value={cardId} onChange={(e) => setCardId(e.target.value)} className="rounded border border-border bg-transparent px-3 py-2 text-sm" placeholder="Card NFT ID" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded border border-border bg-transparent px-3 py-2 text-sm" placeholder="Price sats" />
          <input value={note} onChange={(e) => setNote(e.target.value)} className="rounded border border-border bg-transparent px-3 py-2 text-sm" placeholder="Optional note" />
        </div>
        <Button className="mt-3" onClick={createListing}>List Card</Button>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Active Listings</h2>
        <div className="mt-3 space-y-2">
          {listings.map((l) => (
            <article key={l.id} className="rounded border border-border/70 bg-black/20 p-3 text-sm">
              <p><span className="text-zinc-400">Card:</span> {l.card_id}</p>
              <p><span className="text-zinc-400">Price:</span> {(Number(l.price_sats) / 1e8).toFixed(8)} BCH</p>
              <p><span className="text-zinc-400">Seller:</span> {l.seller_address}</p>
              {l.note && <p><span className="text-zinc-400">Note:</span> {l.note}</p>}
            </article>
          ))}
          {listings.length === 0 && <p className="text-zinc-400">No listings yet.</p>}
        </div>
      </section>
    </main>
  );
}

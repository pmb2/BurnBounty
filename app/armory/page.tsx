'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';
import { BountyWorldScene } from '@/components/BountyWorldScene';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import type { CardAsset } from '@/types/cards';

type ArmoryTab = 'inventory' | 'market' | 'ledger';
type SortOption =
  | 'newest'
  | 'oldest'
  | 'value-desc'
  | 'value-asc'
  | 'tier-desc'
  | 'tier-asc'
  | 'name-asc'
  | 'name-desc';

type MeResponse = {
  ok: boolean;
  user: { id: string; profile?: { displayName?: string } };
  primaryWallet?: { address: string; type: string } | null;
};

const tierRank: Record<CardAsset['tier'], number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamond: 4
};

export default function ArmoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ArmoryTab = tabParam === 'market' || tabParam === 'ledger' ? tabParam : 'inventory';

  const [cards, setCards] = useState<CardAsset[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [listings, setListings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [session, setSession] = useState<MeResponse | null>(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [price, setPrice] = useState('100000');
  const [note, setNote] = useState('');

  const [redeemed, setRedeemed] = useState(0);
  const [house, setHouse] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem('burnbounty.collection');
    const loadedCards = raw ? (JSON.parse(raw) as CardAsset[]) : [];
    setCards(loadedCards);
    if (loadedCards.length) setSelectedCardId(loadedCards[0].nftId);

    setRedeemed(Number(localStorage.getItem('burnbounty.totalRedeemed') || '0'));
    setHouse(Number(localStorage.getItem('burnbounty.houseProfit') || '0'));

    fetch('/api/auth/me')
      .then(async (res) => (res.ok ? ((await res.json()) as MeResponse) : null))
      .then((me) => setSession(me))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    fetch('/api/trading/listings')
      .then((r) => r.json())
      .then((json) => setListings(json.listings || []))
      .catch(() => setListings([]));

    fetch('/api/profiles')
      .then((r) => r.json())
      .then((json) => setProfiles((json.profiles || []).slice(0, 6)))
      .catch(() => setProfiles([]));
  }, []);

  function setTab(nextTab: ArmoryTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', nextTab);
    router.replace(`${pathname}?${next.toString()}`);
  }

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
      if (nextCards.length && !nextCards.some((c) => c.nftId === selectedCardId)) {
        setSelectedCardId(nextCards[0].nftId);
      }

      const nextRedeemed = redeemed + Number(json.payout || 0);
      const nextHouse = house + Number(json.houseCut || 0);
      setRedeemed(nextRedeemed);
      setHouse(nextHouse);
      localStorage.setItem('burnbounty.totalRedeemed', String(nextRedeemed));
      localStorage.setItem('burnbounty.houseProfit', String(nextHouse));

      toast.success('Card redeemed', {
        description: `Payout ${(json.payout / 1e8).toFixed(8)} BCH • house ${(json.houseCut / 1e8).toFixed(8)} BCH`
      });
    } catch (err: any) {
      toast.error('Redeem failed', { description: err.message || 'Unknown redeem error' });
    } finally {
      setRedeeming(null);
    }
  }

  async function createListing() {
    try {
      if (!session?.primaryWallet?.address) {
        throw new Error('Primary wallet not available. Link a wallet in Auth Hub first.');
      }
      if (!selectedCardId) throw new Error('Select a card first.');
      const res = await fetch('/api/trading/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_address: session.primaryWallet.address,
          card_id: selectedCardId,
          price_sats: Number(price),
          note
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Create listing failed');
      toast.success('Listing created');
      setNote('');

      const refresh = await fetch('/api/trading/listings');
      const payload = await refresh.json();
      setListings(payload.listings || []);
    } catch (err: any) {
      toast.error('Listing failed', { description: err.message || 'Unknown error' });
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
      <section className="bounty-board-bg relative mb-6 rounded-3xl px-6 py-7">
        <ActiveBoardBackdrop density="high" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Hunter Armory</h1>
          <p className="text-zinc-300">Inventory, market actions, and bounty ledger in one command center.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant={tab === 'inventory' ? 'default' : 'outline'} onClick={() => setTab('inventory')}>Inventory</Button>
            <Button variant={tab === 'market' ? 'default' : 'outline'} onClick={() => setTab('market')}>Market</Button>
            <Button variant={tab === 'ledger' ? 'default' : 'outline'} onClick={() => setTab('ledger')}>Ledger</Button>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <BountyWorldScene />
      </section>

      {tab === 'inventory' && (
        <section className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Inventory</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="inventory-sort" className="text-xs uppercase tracking-[0.16em] text-zinc-400">Sort</label>
                <select
                  id="inventory-sort"
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
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {sortedCards.map((card) => (
                <div key={card.nftId} className="space-y-3">
                  <Card card={card} />
                  <div className="flex gap-2">
                    <Button onClick={() => redeem(card)} disabled={redeeming === card.nftId} className="w-full">
                      {redeeming === card.nftId ? 'Redeeming...' : `Burn ${card.payoutBch.toFixed(8)} BCH`}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {sortedCards.length === 0 && (
              <div className="mt-4 rounded-xl border border-border/60 bg-black/30 p-4 text-sm text-zinc-300">
                No cards in inventory yet. <Link className="text-emerald-300 underline" href="/play?step=commit">Start a pack hunt.</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'market' && (
        <section className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="medium" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold">Market</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Create off-chain listings with authenticated wallet ownership checks.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Seller wallet: {session?.primaryWallet?.address || 'Not available (link wallet in Auth Hub)'}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="rounded border border-border bg-transparent px-3 py-2 text-sm"
              >
                {cards.length === 0 && <option value="">No cards available</option>}
                {cards.map((card) => (
                  <option key={card.nftId} value={card.nftId} className="bg-[#111]">
                    {card.name} • {card.serial}
                  </option>
                ))}
              </select>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="rounded border border-border bg-transparent px-3 py-2 text-sm" placeholder="Price sats" />
              <input value={note} onChange={(e) => setNote(e.target.value)} className="rounded border border-border bg-transparent px-3 py-2 text-sm" placeholder="Optional note" />
            </div>
            <Button className="mt-3" onClick={createListing}>List Card</Button>

            <div className="mt-6 space-y-2">
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
          </div>
        </section>
      )}

      {tab === 'ledger' && (
        <section className="bounty-panel relative rounded-2xl p-5">
          <ActiveBoardBackdrop density="low" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold">Ledger</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-border bg-card/60 p-6">
                <h3 className="text-sm uppercase tracking-[0.18em] text-zinc-400">Total Bounties Claimed</h3>
                <p className="mt-3 text-4xl font-bold">{(redeemed / 1e8).toFixed(8)} BCH</p>
              </article>
              <article className="rounded-2xl border border-border bg-card/60 p-6">
                <h3 className="text-sm uppercase tracking-[0.18em] text-zinc-400">House Pool (20%)</h3>
                <p className="mt-3 text-4xl font-bold">{(house / 1e8).toFixed(8)} BCH</p>
              </article>
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
              <h3 className="text-sm uppercase tracking-[0.18em] text-zinc-400">Other Hunters</h3>
              <div className="mt-3 space-y-2">
                {profiles.map((p) => (
                  <Link key={p.address} href={`/profile/${encodeURIComponent(p.address)}`} className="block rounded border border-border/70 bg-black/20 px-3 py-2 text-sm hover:bg-black/30">
                    <p className="font-semibold">{p.display_name}</p>
                    <p className="text-xs text-zinc-400">{p.address}</p>
                  </Link>
                ))}
                {profiles.length === 0 && <p className="text-zinc-500">No hunters discovered yet.</p>}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

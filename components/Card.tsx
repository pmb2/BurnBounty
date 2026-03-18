import Image from 'next/image';
import type { CardAsset } from '@/types/cards';
import { tierClass } from '@/lib/cards';

function tierTextClass(tier: CardAsset['tier']) {
  switch (tier) {
    case 'Diamond':
      return 'text-cyan-300';
    case 'Gold':
      return 'text-yellow-300';
    case 'Silver':
      return 'text-slate-200';
    default:
      return 'text-amber-300';
  }
}

export function Card({ card }: { card: CardAsset }) {
  const tierText = tierTextClass(card.tier);
  const statLine = `${card.weeklyDriftMilli >= 0 ? 'Grow' : 'Decay'} ${Math.abs(card.weeklyDriftMilli / 10).toFixed(1)}%/wk • Cap ${(card.randomCapWeeks / 52).toFixed(1)}y`;

  return (
    <article className={`overflow-hidden rounded-2xl border ${tierClass(card.tier)} bg-card`}>
      <div className="relative h-56">
        <Image src={card.image} alt={card.name} fill className="object-cover" />
        <div className={`absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-[10px] font-bold tracking-[0.16em] ${tierText}`}>
          WANTED
        </div>
      </div>
      <div className="space-y-1 p-3">
        <h3 className={`font-semibold ${tierText}`}>{card.name}</h3>
        <p className={`text-xs uppercase tracking-[0.16em] ${tierText}`}>{card.tier}</p>
        <p className={`text-sm ${tierText}`}>Face: {(card.faceValueSats / 1e8).toFixed(8)} BCH</p>
        <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-zinc-300">
          {statLine}
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
          Burn Reward: {(card.payoutSats / 1e8).toFixed(8)} BCH
        </p>
      </div>
    </article>
  );
}

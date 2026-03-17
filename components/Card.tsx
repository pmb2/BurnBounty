import Image from 'next/image';
import type { CardAsset } from '@/types/cards';
import { tierClass } from '@/lib/cards';

export function Card({ card }: { card: CardAsset }) {
  return (
    <article className={`overflow-hidden rounded-2xl border ${tierClass(card.tier)} bg-card`}>
      <div className="relative h-56">
        <Image src={card.image} alt={card.name} fill className="object-cover" />
        <div className="absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-orange-300">
          WANTED
        </div>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-semibold">{card.name}</h3>
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{card.tier}</p>
        <p className="text-sm">Face: {(card.faceValueSats / 1e8).toFixed(8)} BCH</p>
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">Reward: 80% on burn</p>
        <p className="text-xs text-zinc-500">Serial: {card.serial}</p>
      </div>
    </article>
  );
}

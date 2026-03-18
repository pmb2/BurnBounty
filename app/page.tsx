import Link from 'next/link';
import { PackOpeningAnimation } from '@/components/PackOpeningAnimation';
import { Button } from '@/components/ui/button';
import { GameGuideModal } from '@/components/GameGuideModal';
import { ActiveBoardBackdrop } from '@/components/ActiveBoardBackdrop';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <GameGuideModal variant="floating-home" />
      <section className="bounty-board-bg relative grid items-center gap-12 rounded-3xl px-6 py-8 md:grid-cols-2 md:px-8">
        <ActiveBoardBackdrop density="high" />
        <div className="relative z-10 space-y-6">
          <p className="inline-block rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.22em] text-orange-300">
            Bounty Hunters Of The Cash Frontier
          </p>
          <h1 className="text-5xl font-black leading-tight">BurnBounty</h1>
          <p className="max-w-xl text-lg text-zinc-300">
            Hunt the pack. Burn the bounty. Claim the cash. Open 5-card wanted drops, collect rare hunter badges, or
            turn in any card for an instant 80% BCH reward.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/play"><Button size="lg">Start Playing</Button></Link>
            <Link href="/auth?mode=external&next=/play"><Button variant="outline" size="lg">I Have A BCH Wallet</Button></Link>
          </div>
          <p className="text-sm text-zinc-400">
            New players: quick-start uses an embedded wallet. Power users can bring an external BCH wallet.
          </p>
        </div>
        <div className="relative z-10">
          <PackOpeningAnimation />
        </div>
      </section>

      <section className="bounty-panel relative mt-8 rounded-2xl p-6">
        <ActiveBoardBackdrop density="low" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold">First Pack In 3 Steps</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="bounty-paper rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Step 1</p>
            <p className="mt-1 font-semibold">Create Hunter Access</p>
            <p className="mt-1 text-sm text-zinc-300">Use embedded wallet quick-start or connect your own BCH wallet.</p>
          </div>
          <div className="bounty-paper rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Step 2</p>
            <p className="mt-1 font-semibold">Commit Pack</p>
            <p className="mt-1 text-sm text-zinc-300">Lock your bounty drop using a one-time commit transaction.</p>
          </div>
          <div className="bounty-paper rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Step 3</p>
            <p className="mt-1 font-semibold">Reveal & Claim</p>
            <p className="mt-1 text-sm text-zinc-300">Reveal cards, keep rares, or burn for instant BCH payout.</p>
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}


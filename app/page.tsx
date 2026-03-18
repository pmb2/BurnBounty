import Link from 'next/link';
import { PackOpeningAnimation } from '@/components/PackOpeningAnimation';
import { Button } from '@/components/ui/button';
import { GameGuideModal } from '@/components/GameGuideModal';
import { WalletAuthPanel } from '@/components/WalletAuthPanel';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <GameGuideModal variant="floating-home" />
      <section className="grid items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="inline-block rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.22em] text-orange-300">
            Bounty Hunters Of The Cash Frontier
          </p>
          <h1 className="text-5xl font-black leading-tight">BurnBounty</h1>
          <p className="max-w-xl text-lg text-zinc-300">
            Hunt the pack. Burn the bounty. Claim the cash. Open 5-card wanted drops, collect rare hunter badges, or
            turn in any card for an instant 80% BCH reward.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/commit"><Button size="lg">Commit Pack</Button></Link>
            <Link href="/reveal"><Button variant="outline" size="lg">Reveal Bounties</Button></Link>
          </div>
        </div>
        <PackOpeningAnimation />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Sign in with BCH Wallet</h2>
        <p className="mb-4 mt-1 text-zinc-300">Paytaca primary, Electron Cash fallback, MetaMask BCH secondary.</p>
        <WalletAuthPanel />
      </section>
    </main>
  );
}


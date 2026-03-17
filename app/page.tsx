import Link from 'next/link';
import { PackOpeningAnimation } from '@/components/PackOpeningAnimation';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <section className="grid items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="inline-block rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.22em] text-emerald-300">
            BCH Chipnet POC
          </p>
          <h1 className="text-5xl font-black leading-tight">BurnBounty</h1>
          <p className="max-w-xl text-lg text-zinc-300">
            Commit a pack purchase, reveal deterministic on-chain randomness, receive 5 collectible CashToken cards, and
            burn any card for 80% BCH.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/commit"><Button size="lg">Commit Pack</Button></Link>
            <Link href="/reveal"><Button variant="outline" size="lg">Reveal Pack</Button></Link>
          </div>
        </div>
        <PackOpeningAnimation />
      </section>
    </main>
  );
}


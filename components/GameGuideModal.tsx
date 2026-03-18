'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type TriggerVariant = 'floating-home' | 'bottom-nav';

export function GameGuideModal({ variant = 'bottom-nav' }: { variant?: TriggerVariant }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'floating-home' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-5 top-24 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/60 bg-[#1d110a]/95 text-lg font-black text-amber-200 shadow-[0_0_18px_rgba(251,146,60,0.35)] transition hover:scale-105"
          aria-label="Open Bounty Hunter Handbook"
          title="How Decay Works"
        >
          ?
        </button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>Handbook</Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-amber-500/40 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_45%),linear-gradient(180deg,#180f0a_0%,#120d0a_100%)]">
            <div className="flex items-center justify-between border-b border-amber-500/30 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Bounty Hunter Handbook</p>
                <h2 className="text-2xl font-black">How BurnBounty Decay Works</h2>
              </div>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>

            <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5 text-sm text-zinc-200">
              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">1) How Decay Works</h3>
                <p>Each card rolls a hidden weekly drift. Some bounties decay, some grow. Your payout multiplier updates by weeks held, then stops at that card&apos;s cap.</p>
                <div className="mt-3 rounded border border-amber-500/30 bg-black/30 p-3 text-xs font-mono text-amber-100">
                  weeks = (currentHeight - mintHeight) / 1008{`\n`}
                  effectiveWeeks = min(weeks, randomCapWeeks){`\n`}
                  multiplier = max(0.40, 1 + (weeklyDrift/1000) * effectiveWeeks)
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">2) The Floor</h3>
                <p>Cards never decay below <strong>40% of original face value</strong>. No bounty ever hits zero.</p>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">3) Growth Caps</h3>
                <p>Every card has a random growth/decay cap window:</p>
                <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                  <li>Bronze: 0-52 weeks</li>
                  <li>Silver: 26-104 weeks</li>
                  <li>Gold: 78-182 weeks</li>
                  <li>Diamond: 130-260 weeks (up to 5 years)</li>
                </ul>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">4) Series Differences & Investor Perks</h3>
                <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                  <li>Genesis Beta (Series 1): 0.05 BCH, minimum drift +5</li>
                  <li>Founder Edition (Series 2): 0.02 BCH, minimum drift +1</li>
                  <li>Normal: 0.008 BCH</li>
                </ul>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">5) House Edge Explained</h3>
                <p>The frontier always takes its cut. Burn payouts are 80% of the adjusted value, with 20% routed to the pool. Long-run average drift remains negative, keeping the system sustainable.</p>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">6) Quick Math Examples</h3>
                <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                  <li>100 BCH face, drift -2, 20 effective weeks =&gt; multiplier 0.96 =&gt; burn payout 76.8 BCH</li>
                  <li>100 BCH face, drift +6, 30 effective weeks =&gt; multiplier 1.18 =&gt; burn payout 94.4 BCH</li>
                  <li>Even with deep decay, floor enforces multiplier &gt;= 0.40</li>
                </ul>
              </section>

              <section className="rounded-xl border border-border/70 bg-black/25 p-4">
                <h3 className="mb-2 text-lg font-bold text-amber-200">7) Login, Profiles & Trading</h3>
                <p>BurnBounty uses hybrid auth: embedded wallet quick-start for new hunters, external BCH signature auth for power users, and optional MetaMask Snap compatibility. Public profiles show hunter collections, and the trading post supports off-chain listings with on-chain settlement through escrow covenants.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-300">
                  <li>Embedded wallet: primary onboarding path</li>
                  <li>External BCH wallet: sign challenge to login/link</li>
                  <li>MetaMask Snap: optional experimental path</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

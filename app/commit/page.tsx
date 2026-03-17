'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

async function hash256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const first = await crypto.subtle.digest('SHA-256', bytes);
  const second = await crypto.subtle.digest('SHA-256', first);
  return Array.from(new Uint8Array(second)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function CommitPage() {
  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function commitPack() {
    setLoading(true);
    try {
      const wif = localStorage.getItem('burnbounty.wif') || '';
      const userSeed = `${crypto.randomUUID()}:${Date.now()}`;
      const nonce = crypto.randomUUID().slice(0, 12);
      const commitmentHash = await hash256Hex(`${userSeed}:${nonce}`);

      const res = await fetch('/api/commit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wif, commitmentHash })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Commit failed');

      const stash = { userSeed, nonce, pending: json };
      localStorage.setItem('burnbounty.pendingReveal', JSON.stringify(stash));
      setPending(stash);
      toast.success('Pack committed', {
        description: `Commit tx created. Reveal before block ${json.revealDeadline}.`
      });
    } catch (err: any) {
      toast.error('Commit failed', { description: err.message || 'Unknown commit error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Claim A Bounty Drop</h1>
      <p className="mt-2 text-zinc-300">
        Step 1 of 2: lock your bounty drop by committing a private reveal seed hash.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <Button onClick={commitPack} disabled={loading}>{loading ? 'Committing...' : 'Lock Bounty Pack (0.001 BCH)'}</Button>
      </div>

      {pending && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-zinc-300">
          <p>Commit txid: {pending.pending.commitTxid}</p>
          <p>Commitment hash: {pending.pending.commitmentHash}</p>
          <p>Reveal deadline: block {pending.pending.revealDeadline}</p>
          <p className="mt-2 text-amber-300">Keep this tab data private until reveal. Demo WIF mode only.</p>
        </div>
      )}
    </main>
  );
}


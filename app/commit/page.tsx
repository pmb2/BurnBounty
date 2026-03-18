'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isLikelyTestnetWif, maskWif } from '@/lib/wif';

const SERIES_OPTIONS = [
  { value: 'GENESIS_BETA', label: 'Genesis Beta (Series 1)', priceSats: 5_000_000, perk: 'Min drift +5/wk' },
  { value: 'FOUNDER_EDITION', label: 'Founder Edition (Series 2)', priceSats: 2_000_000, perk: 'Min drift +1/wk' },
  { value: 'NORMAL', label: 'Normal', priceSats: 800_000, perk: 'Standard drift rules' }
] as const;

async function hash256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const first = await crypto.subtle.digest('SHA-256', bytes);
  const second = await crypto.subtle.digest('SHA-256', first);
  return Array.from(new Uint8Array(second)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function CommitPage() {
  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [wifInput, setWifInput] = useState('');
  const [connectedAddress, setConnectedAddress] = useState('');
  const [series, setSeries] = useState<(typeof SERIES_OPTIONS)[number]['value']>('NORMAL');

  function connectWallet() {
    const normalized = wifInput.trim();
    if (!normalized) {
      toast.error('Missing WIF', { description: 'Paste a chipnet/testnet WIF to continue.' });
      return;
    }
    try {
      if (!isLikelyTestnetWif(normalized)) {
        throw new Error('The provided key does not look like a valid WIF.');
      }
      localStorage.setItem('burnbounty.wif', normalized);
      setConnectedAddress(maskWif(normalized));
      setWifInput('');
      toast.success('Wallet connected', { description: `Using ${maskWif(normalized)}` });
    } catch {
      toast.error('Invalid WIF', { description: 'The provided key could not be parsed.' });
    }
  }

  async function commitPack() {
    setLoading(true);
    try {
      const wif = (localStorage.getItem('burnbounty.wif') || '').trim();
      if (!wif) {
        throw new Error('Chipnet WIF required. Connect wallet first.');
      }
      const userSeed = `${crypto.randomUUID()}:${Date.now()}`;
      const nonce = crypto.randomUUID().slice(0, 12);
      const commitmentHash = await hash256Hex(`${userSeed}:${nonce}`);

      const res = await fetch('/api/commit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wif, commitmentHash, series })
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
        <div className="mb-4 space-y-2">
          <label htmlFor="series" className="text-xs uppercase tracking-[0.16em] text-zinc-400">Series</label>
          <select
            id="series"
            value={series}
            onChange={(e) => setSeries(e.target.value as (typeof SERIES_OPTIONS)[number]['value'])}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm md:max-w-md"
          >
            {SERIES_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
            ))}
          </select>
          <p className="text-xs text-amber-200">
            {SERIES_OPTIONS.find((s) => s.value === series)?.perk} • Price {(Number(SERIES_OPTIONS.find((s) => s.value === series)?.priceSats || 0) / 1e8).toFixed(8)} BCH
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={wifInput}
            onChange={(e) => setWifInput(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm md:max-w-md"
            placeholder="Paste chipnet/testnet WIF (demo only)"
          />
          <Button variant="outline" onClick={connectWallet}>Connect WIF</Button>
          <Button onClick={commitPack} disabled={loading}>
            {loading ? 'Committing...' : `Lock Bounty Pack (${(Number(SERIES_OPTIONS.find((s) => s.value === series)?.priceSats || 0) / 1e8).toFixed(8)} BCH)`}
          </Button>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          {connectedAddress || 'No wallet connected on this browser yet.'}
        </p>
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


'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { WalletRecord } from '@/types/auth';

type SessionEntry = {
  id: string;
  issuedAt: string;
  lastSeenAt?: string | null;
  recentAuthAt?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  metadata?: Record<string, unknown>;
};

type MeResponse = {
  ok: boolean;
  user: {
    id: string;
    profile?: { displayName?: string; avatarUrl?: string; rankLabel?: string };
  };
  wallets: WalletRecord[];
  primaryWallet?: WalletRecord | null;
};

async function readJsonSafe<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function shortAddress(value: string) {
  if (value.length <= 20) return value;
  return `${value.slice(0, 12)}...${value.slice(-6)}`;
}

export function UserSettingsPanel() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [mode, setMode] = useState<'electrum' | 'paytaca'>('electrum');

  async function refreshAll() {
    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      const me = await readJsonSafe<MeResponse>(meRes);
      setSession(me);
    } else {
      setSession(null);
    }
    const sessionsRes = await fetch('/api/auth/sessions');
    if (sessionsRes.ok) {
      const body = await readJsonSafe<{ ok: true; sessions: SessionEntry[] }>(sessionsRes);
      setSessions(body.sessions || []);
    } else {
      setSessions([]);
    }
  }

  useEffect(() => {
    refreshAll().catch(() => {
      setSession(null);
      setSessions([]);
    });
  }, []);

  async function createLinkChallenge() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionLabel: 'Link Wallet',
          purpose: 'link_wallet',
          walletProvider: 'external_bch',
          walletSignMode: mode,
          address
        })
      });
      const body = await readJsonSafe<{ challenge: string; challengeId: string; error?: string }>(res);
      if (!res.ok) throw new Error(body.error || 'Failed to create challenge');
      setChallenge(body.challenge);
      setChallengeId(body.challengeId);
      if (mode === 'paytaca') {
        window.open(`paytaca://wc?message=${encodeURIComponent(body.challenge)}`, '_blank');
      }
      toast.success('Challenge ready');
    } catch (err: any) {
      toast.error('Link challenge failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function verifyLink() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          address,
          signature,
          expectedPurpose: 'link_wallet'
        })
      });
      const body = await readJsonSafe<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(body.error || 'Wallet verification failed');
      toast.success('External wallet linked');
      setSignature('');
      setChallenge('');
      setChallengeId('');
      await refreshAll();
    } catch (err: any) {
      toast.error('Link verification failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function unlinkWallet(walletAddress: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/wallet/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress })
      });
      const body = await readJsonSafe<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(body.error || 'Unlink failed');
      toast.success('Wallet unlinked');
      await refreshAll();
    } catch (err: any) {
      toast.error('Wallet unlink failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <header>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-sm text-zinc-300">Manage linked wallets and session activity.</p>
      </header>

      <article className="rounded-xl border border-border/60 bg-black/25 p-4">
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="mt-1 text-sm text-zinc-300">Name: {session?.user?.profile?.displayName || 'Unknown'}</p>
        <p className="text-sm text-zinc-300">Rank: {session?.user?.profile?.rankLabel || 'Greenhorn'}</p>
        <p className="text-xs text-zinc-500">User ID: {session?.user?.id || 'n/a'}</p>
      </article>

      <article className="rounded-xl border border-border/60 bg-black/25 p-4">
        <h3 className="text-lg font-semibold">Linked Wallets</h3>
        <div className="mt-3 space-y-2">
          {(session?.wallets || []).map((wallet) => (
            <div key={wallet.id} className="flex items-center justify-between rounded border border-border/60 bg-black/20 px-3 py-2 text-sm">
              <div>
                <p>{shortAddress(wallet.address)} {wallet.isPrimary ? '(Primary)' : ''}</p>
                <p className="text-xs text-zinc-400">{wallet.type} {wallet.metadata?.custody ? `• ${String(wallet.metadata.custody)}` : ''}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || wallet.isPrimary}
                onClick={() => unlinkWallet(wallet.address)}
              >
                Unlink
              </Button>
            </div>
          ))}
          {!session?.wallets?.length && <p className="text-sm text-zinc-400">No wallets linked yet.</p>}
        </div>
      </article>

      <article className="rounded-xl border border-border/60 bg-black/25 p-4">
        <h3 className="text-lg font-semibold">Link External BCH Wallet</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'electrum' | 'paytaca')}
            className="rounded border border-border bg-transparent px-2 py-2 text-sm"
          >
            <option value="electrum">Electron Cash</option>
            <option value="paytaca">Paytaca</option>
          </select>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded border border-border bg-transparent px-2 py-2 text-sm md:col-span-2"
            placeholder="bitcoincash:... or bchtest:..."
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={createLinkChallenge} disabled={loading || !address}>Create Link Challenge</Button>
        </div>
        {!!challenge && (
          <div className="mt-3 space-y-2 rounded border border-amber-500/30 bg-black/30 p-3">
            <textarea readOnly value={challenge} className="h-24 w-full rounded border border-border bg-transparent p-2 text-xs" />
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="w-full rounded border border-border bg-transparent px-2 py-2 text-sm"
              placeholder="Paste signature"
            />
            <Button onClick={verifyLink} disabled={loading || !challengeId || !signature}>Verify & Link</Button>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-border/60 bg-black/25 p-4">
        <h3 className="text-lg font-semibold">Recent Sessions</h3>
        <div className="mt-3 space-y-2">
          {sessions.map((entry) => (
            <div key={entry.id} className="rounded border border-border/60 bg-black/20 px-3 py-2 text-xs">
              <p>Issued: {new Date(entry.issuedAt).toLocaleString()}</p>
              <p>Last seen: {entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleString() : 'n/a'}</p>
              <p>Expires: {new Date(entry.expiresAt).toLocaleString()}</p>
              {entry.revokedAt && <p className="text-red-300">Revoked: {new Date(entry.revokedAt).toLocaleString()}</p>}
            </div>
          ))}
          {!sessions.length && <p className="text-sm text-zinc-400">No session records yet.</p>}
        </div>
      </article>
    </section>
  );
}

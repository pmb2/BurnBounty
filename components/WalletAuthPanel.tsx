'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createEmbeddedWalletForUser, signWithEmbeddedWallet } from '@/lib/auth/embedded-wallet';
import { WALLET_PROVIDER_DEFINITIONS } from '@/lib/auth/providers';
import type { WalletRecord } from '@/types/auth';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type ExternalMode = 'paytaca' | 'electrum';
type ChallengePurpose = 'login' | 'register' | 'link_wallet' | 'verify_wallet' | 'sensitive_action';

type MeResponse = {
  ok: boolean;
  user: { id: string; profile?: { displayName?: string } };
  wallets: WalletRecord[];
  primaryWallet?: WalletRecord | null;
};

async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json as T;
}

export function WalletAuthPanel() {
  const [activeTab, setActiveTab] = useState<'embedded' | 'external' | 'snap'>('embedded');
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [challenge, setChallenge] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [challengePurpose, setChallengePurpose] = useState<ChallengePurpose>('login');
  const [externalMode, setExternalMode] = useState<ExternalMode>('electrum');

  const [snapAddress, setSnapAddress] = useState('');

  const providerCards = useMemo(() => WALLET_PROVIDER_DEFINITIONS, []);

  async function refreshSession() {
    const me = await fetchMe();
    setSession(me);
  }

  useEffect(() => {
    refreshSession().catch(() => setSession(null));
  }, []);

  async function registerEmbedded() {
    setLoading(true);
    try {
      const result = await postJson<{ ok: true; user: { id: string } }>('/api/auth/register', {
        username,
        passphrase,
        displayName
      });
      const wallet = await createEmbeddedWalletForUser(result.user.id, passphrase);
      await postJson('/api/auth/wallet/embedded/create', {
        address: wallet.address,
        walletCreatedAt: wallet.createdAt,
        walletVersion: 'v1-client-encrypted'
      });
      toast.success('Embedded wallet created', { description: 'Quick-start account is ready.' });
      await refreshSession();
    } catch (err: any) {
      toast.error('Embedded registration failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function loginEmbedded() {
    setLoading(true);
    try {
      await postJson('/api/auth/login', { username, passphrase });
      toast.success('Signed in', { description: 'Embedded wallet account authenticated.' });
      await refreshSession();
    } catch (err: any) {
      toast.error('Embedded login failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function startExternalChallenge(purpose: ChallengePurpose = 'login') {
    setLoading(true);
    try {
      const result = await postJson<{ challenge: string; challengeId: string; expiresAt: string }>('/api/auth/wallet/challenge', {
        actionLabel: purpose === 'link_wallet' ? 'Link Wallet' : 'Login',
        purpose,
        walletProvider: 'external_bch',
        walletSignMode: externalMode,
        address
      });
      setChallenge(result.challenge);
      setChallengeId(result.challengeId);
      setChallengePurpose(purpose);
      if (externalMode === 'paytaca') {
        const deeplink = `paytaca://wc?message=${encodeURIComponent(result.challenge)}`;
        window.open(deeplink, '_blank');
      }
      toast.success('Challenge ready', { description: 'Sign and paste signature to continue.' });
    } catch (err: any) {
      toast.error('Could not create challenge', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function verifyExternalChallenge() {
    setLoading(true);
    try {
      await postJson('/api/auth/wallet/verify', {
        challengeId,
        address,
        signature,
        expectedPurpose: challengePurpose
      });
      setSignature('');
      toast.success(challengePurpose === 'link_wallet' ? 'Wallet linked' : 'External wallet authenticated');
      await refreshSession();
    } catch (err: any) {
      toast.error('Verification failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function signAndVerifyWithEmbeddedWallet() {
    setLoading(true);
    try {
      if (!session?.user?.id) throw new Error('No active session');
      if (!session.primaryWallet?.address) throw new Error('No primary wallet bound for this session');
      const local = await postJson<{ challenge: string; challengeId: string }>('/api/auth/wallet/challenge', {
        actionLabel: 'Verify Embedded Wallet',
        purpose: 'verify_wallet',
        walletProvider: 'external_bch',
        walletSignMode: 'manual',
        address: session.primaryWallet.address
      });
      const sig = await signWithEmbeddedWallet(session.user.id, passphrase, local.challenge);
      await postJson('/api/auth/wallet/verify', {
        challengeId: local.challengeId,
        address: session.primaryWallet.address,
        signature: sig,
        expectedPurpose: 'verify_wallet'
      });
      toast.success('Embedded wallet verified');
      await refreshSession();
    } catch (err: any) {
      toast.error('Embedded verification failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function loginWithSnap() {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is not available');
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const usingAddress = (snapAddress || account || '').trim();
      if (!usingAddress) throw new Error('No Snap/MetaMask address available');

      const c = await postJson<{ challenge: string; challengeId: string }>('/api/auth/wallet/challenge', {
        actionLabel: 'Login',
        purpose: 'login',
        walletProvider: 'metamask_snap',
        walletSignMode: 'metamask_snap',
        address: usingAddress
      });
      const sig = await window.ethereum.request({ method: 'personal_sign', params: [c.challenge, usingAddress] });
      await postJson('/api/auth/wallet/verify', {
        challengeId: c.challengeId,
        address: usingAddress,
        signature: sig,
        expectedPurpose: 'login'
      });
      toast.success('MetaMask Snap auth complete', { description: 'Experimental provider accepted.' });
      await refreshSession();
    } catch (err: any) {
      toast.error('Snap authentication failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function unlinkWallet(addressToUnlink: string) {
    setLoading(true);
    try {
      await postJson('/api/auth/wallet/unlink', { address: addressToUnlink });
      toast.success('Wallet unlinked');
      await refreshSession();
    } catch (err: any) {
      toast.error('Unlink failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await postJson('/api/auth/logout', {});
    setSession(null);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-2 md:grid-cols-3">
        {providerCards.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id === 'external_bch' ? 'external' : p.id === 'metamask_snap' ? 'snap' : 'embedded')}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${p.authPriority === 'primary' ? 'border-green-500/50' : p.authPriority === 'experimental' ? 'border-amber-500/50' : 'border-border'}`}
          >
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs text-zinc-400">{p.description}</p>
          </button>
        ))}
      </div>

      {session?.ok && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <p className="font-semibold">Authenticated as {session.user.profile?.displayName || session.user.id}</p>
          <p className="text-xs text-zinc-300">Primary wallet: {session.primaryWallet?.address || 'none yet'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => startExternalChallenge('link_wallet')} disabled={loading}>Link External Wallet</Button>
            <Button size="sm" variant="outline" onClick={signAndVerifyWithEmbeddedWallet} disabled={loading}>Verify Embedded Wallet</Button>
            <Button size="sm" variant="outline" onClick={logout} disabled={loading}>Logout</Button>
          </div>
          {!!session.wallets?.length && (
            <div className="mt-3 space-y-1">
              {session.wallets.map((w) => (
                <div key={`${w.address}-${w.type}`} className="flex items-center justify-between rounded border border-border/60 bg-black/20 px-2 py-1 text-xs">
                  <span>{w.address} ({w.type}) {w.isPrimary ? '[primary]' : ''}</span>
                  <Button size="sm" variant="outline" onClick={() => unlinkWallet(w.address)} disabled={loading}>Unlink</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'embedded' && (
        <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-sm font-semibold">Quick Start (Recommended): Embedded Wallet</p>
          <p className="text-xs text-zinc-300">Create an account and encrypted local BCH wallet in one step. Best for new players.</p>
          <div className="grid gap-2 md:grid-cols-3">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="username" />
            <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} type="password" className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="passphrase" />
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="display name (optional)" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={registerEmbedded} disabled={loading}>Create Embedded Account</Button>
            <Button variant="outline" onClick={loginEmbedded} disabled={loading}>Login with Embedded Account</Button>
          </div>
        </div>
      )}

      {activeTab === 'external' && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">External BCH Wallet (Advanced / Power User)</p>
          <p className="text-xs text-zinc-300">Bring your own wallet. Sign a one-time challenge to authenticate non-custodially.</p>
          <div className="grid gap-2 md:grid-cols-3">
            <select value={externalMode} onChange={(e) => setExternalMode(e.target.value as ExternalMode)} className="rounded border border-border bg-transparent px-2 py-2 text-sm">
              <option value="electrum">Electron Cash (manual sign)</option>
              <option value="paytaca">Paytaca (deep-link + paste signature)</option>
            </select>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded border border-border bg-transparent px-2 py-2 text-sm md:col-span-2" placeholder="bitcoincash:... or bchtest:..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => startExternalChallenge('login')} disabled={loading}>Create Login Challenge</Button>
            <Button variant="outline" onClick={() => startExternalChallenge('register')} disabled={loading}>Register via Wallet</Button>
          </div>
          {!!challenge && (
            <div className="space-y-2 rounded border border-amber-500/25 bg-black/25 p-2">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Challenge</p>
              <textarea readOnly value={challenge} className="h-24 w-full rounded border border-border bg-transparent p-2 text-xs" />
              <input value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="Paste signature" />
              <Button onClick={verifyExternalChallenge} disabled={loading || !challengeId || !signature}>Verify Signature</Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'snap' && (
        <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-sm font-semibold">MetaMask Snap (Experimental / Optional)</p>
          <p className="text-xs text-zinc-300">This is not BurnBounty’s primary BCH auth path. Use only if you explicitly want a MetaMask-based bridge flow.</p>
          <input value={snapAddress} onChange={(e) => setSnapAddress(e.target.value)} className="w-full rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="0x... (optional, defaults to active account)" />
          <Button variant="outline" onClick={loginWithSnap} disabled={loading}>Connect MetaMask Snap</Button>
        </div>
      )}
    </div>
  );
}

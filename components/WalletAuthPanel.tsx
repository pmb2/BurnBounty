'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

type WalletAuthPanelProps = {
  defaultMode?: 'embedded' | 'external' | 'snap';
  nextPath?: string;
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

export function WalletAuthPanel({ defaultMode = 'embedded', nextPath = '/dashboard' }: WalletAuthPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'embedded' | 'external' | 'snap'>(defaultMode);
  const [showAdvanced, setShowAdvanced] = useState(defaultMode !== 'embedded');
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

  async function refreshSession() {
    const me = await fetchMe();
    setSession(me);
  }

  useEffect(() => {
    refreshSession().catch(() => setSession(null));
  }, []);

  useEffect(() => {
    setActiveTab(defaultMode);
    setShowAdvanced(defaultMode !== 'embedded');
  }, [defaultMode]);

  function goNext() {
    if (nextPath) router.push(nextPath);
  }

  async function registerAccount() {
    setLoading(true);
    try {
      await postJson('/api/auth/register', { username, passphrase, displayName });
      toast.success('Account created', { description: 'Embedded wallet was provisioned automatically.' });
      await refreshSession();
      goNext();
    } catch (err: any) {
      toast.error('Registration failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function loginAccount() {
    setLoading(true);
    try {
      await postJson('/api/auth/login', { username, passphrase });
      toast.success('Signed in');
      await refreshSession();
      goNext();
    } catch (err: any) {
      toast.error('Login failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  async function startExternalChallenge(purpose: ChallengePurpose = 'login') {
    setLoading(true);
    try {
      const result = await postJson<{ challenge: string; challengeId: string }>('/api/auth/wallet/challenge', {
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
      if (challengePurpose !== 'link_wallet' && challengePurpose !== 'verify_wallet') goNext();
    } catch (err: any) {
      toast.error('Verification failed', { description: err.message || 'Unknown error' });
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
      toast.success('MetaMask Snap auth complete');
      await refreshSession();
      goNext();
    } catch (err: any) {
      toast.error('Snap authentication failed', { description: err.message || 'Unknown error' });
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
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
        <p className="text-sm font-semibold text-emerald-100">Quick Start</p>
        <p className="mt-1 text-xs text-zinc-200">
          Create an account or continue with Google. BurnBounty auto-provisions your embedded BCH wallet.
        </p>
      </div>

      {session?.ok && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <p className="font-semibold">Authenticated as {session.user.profile?.displayName || session.user.id}</p>
          <p className="text-xs text-zinc-300">Primary wallet: {session.primaryWallet?.address || 'none yet'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/settings"><Button size="sm" variant="outline">Open Settings</Button></Link>
            <Button size="sm" variant="outline" onClick={logout} disabled={loading}>Logout</Button>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
        <p className="text-sm font-semibold">Email/Username Access</p>
        <div className="grid gap-2 md:grid-cols-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="username" />
          <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} type="password" className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="passphrase" />
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="display name (optional)" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={registerAccount} disabled={loading}>Create Account</Button>
          <Button variant="outline" onClick={loginAccount} disabled={loading}>Login</Button>
          <Link
            href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex items-center rounded-md border border-emerald-400/50 bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20"
          >
            Continue with Google
          </Link>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Advanced Wallet Options</p>
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced((s) => !s)}>
            {showAdvanced ? 'Hide' : 'Show'}
          </Button>
        </div>
        <p className="text-xs text-zinc-300">
          External BCH login and MetaMask Snap remain optional for power users.
        </p>

        {showAdvanced && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant={activeTab === 'external' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('external')}>
                External BCH
              </Button>
              <Button variant={activeTab === 'snap' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('snap')}>
                MetaMask Snap
              </Button>
            </div>

            {activeTab === 'external' && (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">External BCH Wallet</p>
                <p className="text-xs text-zinc-300">Sign a challenge to authenticate without sending BCH.</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <select value={externalMode} onChange={(e) => setExternalMode(e.target.value as ExternalMode)} className="rounded border border-border bg-transparent px-2 py-2 text-sm">
                    <option value="electrum">Electron Cash (manual)</option>
                    <option value="paytaca">Paytaca (deep-link)</option>
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
                <p className="text-sm font-semibold">MetaMask Snap (Experimental)</p>
                <p className="text-xs text-zinc-300">Optional non-core bridge path.</p>
                <input value={snapAddress} onChange={(e) => setSnapAddress(e.target.value)} className="w-full rounded border border-border bg-transparent px-2 py-2 text-sm" placeholder="0x... (optional)" />
                <Button variant="outline" onClick={loginWithSnap} disabled={loading}>Connect MetaMask Snap</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

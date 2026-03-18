'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type WalletType = 'paytaca' | 'electrum' | 'metamask';

async function createChallenge(address: string, walletType: WalletType) {
  const res = await fetch('/api/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, walletType })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Challenge failed');
  return json as { message: string; nonce: string };
}

async function verifyLogin(address: string, walletType: WalletType, message: string, signature: string) {
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, walletType, message, signature })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Verification failed');
  return json;
}

export function WalletAuthPanel() {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState<WalletType | null>(null);

  async function startElectronSignIn() {
    setLoading('electrum');
    try {
      if (!address.trim()) throw new Error('Enter your BCH address first');
      const challenge = await createChallenge(address.trim(), 'electrum');
      setMessage(challenge.message);
      toast.success('Challenge created', { description: 'Sign this message in Electron Cash and paste signature.' });
    } catch (err: any) {
      toast.error('Electron sign-in failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(null);
    }
  }

  async function finishElectronSignIn() {
    setLoading('electrum');
    try {
      if (!message || !signature) throw new Error('Challenge message + signature required');
      await verifyLogin(address.trim(), 'electrum', message, signature.trim());
      localStorage.setItem('burnbounty.auth.address', address.trim());
      toast.success('Signed in', { description: 'Electron Cash verification complete.' });
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error('Verification failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(null);
    }
  }

  async function signInPaytaca() {
    setLoading('paytaca');
    try {
      if (!address.trim()) throw new Error('Enter your BCH address first');
      const challenge = await createChallenge(address.trim(), 'paytaca');
      setMessage(challenge.message);
      const deeplink = `paytaca://wc?message=${encodeURIComponent(challenge.message)}`;
      window.open(deeplink, '_blank');
      toast.success('Paytaca request opened', { description: 'Sign in Paytaca, then paste signature below.' });
    } catch (err: any) {
      toast.error('Paytaca flow failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(null);
    }
  }

  async function signInMetaMask() {
    setLoading('metamask');
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const challenge = await createChallenge(account, 'metamask');
      const sig = await window.ethereum.request({ method: 'personal_sign', params: [challenge.message, account] });
      await verifyLogin(account, 'metamask', challenge.message, sig);
      localStorage.setItem('burnbounty.auth.address', account);
      toast.success('Signed in', { description: 'MetaMask challenge verified.' });
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error('MetaMask sign-in failed', { description: err.message || 'Unknown error' });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.16em] text-zinc-400">Wallet Address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          placeholder="bitcoincash:... or 0x..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={signInPaytaca} disabled={loading !== null}>{loading === 'paytaca' ? 'Connecting...' : 'Connect Paytaca'}</Button>
        <Button variant="outline" onClick={startElectronSignIn} disabled={loading !== null}>{loading === 'electrum' ? 'Preparing...' : 'Sign with Electron Cash'}</Button>
        <Button variant="outline" onClick={signInMetaMask} disabled={loading !== null}>{loading === 'metamask' ? 'Connecting...' : 'Connect MetaMask (BCH)'}</Button>
      </div>

      {message && (
        <div className="space-y-2 rounded-xl border border-amber-500/25 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Challenge Message</p>
          <textarea value={message} readOnly className="h-24 w-full rounded border border-border bg-transparent p-2 text-xs" />
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="h-24 w-full rounded border border-border bg-transparent p-2 text-xs"
            placeholder="Paste wallet signature here"
          />
          <Button onClick={finishElectronSignIn} disabled={loading !== null}>Verify Signature</Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { deriveAddressFromWif } from '@/lib/wallet';
import { Button } from './ui/button';

export function WalletConnect() {
  const [wif, setWif] = useState('');
  const [savedWif, setSavedWif] = useState(typeof window === 'undefined' ? '' : (localStorage.getItem('cashborders.wif') || ''));
  const address = useMemo(() => {
    if (!savedWif) return '';
    try {
      return deriveAddressFromWif(savedWif);
    } catch {
      return 'Invalid WIF';
    }
  }, [savedWif]);

  function save() {
    localStorage.setItem('cashborders.wif', wif.trim());
    setSavedWif(wif.trim());
    setWif('');
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={wif}
        onChange={(e) => setWif(e.target.value)}
        className="w-44 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
        placeholder="Chipnet WIF (demo only)"
      />
      <Button size="sm" onClick={save}>Connect</Button>
      <span className="hidden max-w-52 truncate text-xs text-amber-300 md:block">{address || 'Demo key only - never use mainnet funds'}</span>
    </div>
  );
}

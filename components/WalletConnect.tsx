'use client';

import { useEffect, useState } from 'react';
import { isLikelyTestnetWif, maskWif } from '@/lib/wif';
import { Button } from './ui/button';

export function WalletConnect() {
  const [wif, setWif] = useState('');
  const [savedWif, setSavedWif] = useState('');

  useEffect(() => {
    setSavedWif(localStorage.getItem('burnbounty.wif') || '');
  }, []);
  function save() {
    const normalized = wif.trim();
    if (!isLikelyTestnetWif(normalized)) {
      setSavedWif('');
      return;
    }
    localStorage.setItem('burnbounty.wif', normalized);
    setSavedWif(normalized);
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
      <span className="hidden max-w-52 truncate text-xs text-amber-300 md:block">{savedWif ? `Connected: ${maskWif(savedWif)}` : 'Demo key only - never use mainnet funds'}</span>
    </div>
  );
}


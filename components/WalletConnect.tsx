'use client';

import { useEffect, useState } from 'react';
import { isLikelyTestnetWif, maskWif } from '@/lib/wif';
import { Button } from './ui/button';

export function WalletConnect() {
  const [wif, setWif] = useState('');
  const [savedWif, setSavedWif] = useState('');
  const [showWifInput, setShowWifInput] = useState(false);
  const [authLabel, setAuthLabel] = useState('Not signed in');

  useEffect(() => {
    setSavedWif(localStorage.getItem('burnbounty.wif') || '');
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          setAuthLabel('Not signed in');
          return;
        }
        const json = await res.json();
        const primary = json?.primaryWallet;
        if (!primary?.address) {
          setAuthLabel('Signed in');
          return;
        }
        const shortAddress = `${primary.address.slice(0, 14)}...${primary.address.slice(-6)}`;
        setAuthLabel(`${primary.type === 'embedded' ? 'Embedded' : 'External'}: ${shortAddress}`);
      })
      .catch(() => setAuthLabel('Not signed in'));
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
      <span className="hidden max-w-64 truncate rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 md:block">
        {authLabel}
      </span>
      <Button size="sm" variant="outline" onClick={() => setShowWifInput((v) => !v)}>
        {showWifInput ? 'Hide Gameplay Key' : 'Gameplay Key'}
      </Button>
      {showWifInput && (
        <>
          <input
            value={wif}
            onChange={(e) => setWif(e.target.value)}
            className="w-44 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
            placeholder="Chipnet WIF (demo gameplay only)"
          />
          <Button size="sm" onClick={save}>Connect</Button>
        </>
      )}
      <span className="hidden max-w-64 truncate text-xs text-amber-300 xl:block">
        {savedWif ? `Gameplay key: ${maskWif(savedWif)}` : 'Used for chipnet gameplay calls, never account auth'}
      </span>
    </div>
  );
}


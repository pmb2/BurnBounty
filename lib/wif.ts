export function isLikelyTestnetWif(value: string): boolean {
  const wif = value.trim();
  // Testnet/chipnet WIF commonly starts with c/9, but we also allow common WIF prefixes
  // to keep the UI permissive. Server-side chain logic still performs authoritative parsing.
  if (!/^[5KL9c][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(wif)) return false;
  return true;
}

export function maskWif(value: string): string {
  const wif = value.trim();
  if (wif.length <= 10) return wif;
  return `${wif.slice(0, 6)}...${wif.slice(-4)}`;
}

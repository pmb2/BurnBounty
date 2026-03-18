const challenges = new Map<string, { message: string; nonce: string; createdAt: number; walletType: string }>();

export function setChallenge(address: string, walletType: string, message: string, nonce: string) {
  challenges.set(address.toLowerCase(), { message, nonce, createdAt: Date.now(), walletType });
}

export function getChallenge(address: string) {
  return challenges.get(address.toLowerCase());
}

export function clearChallenge(address: string) {
  challenges.delete(address.toLowerCase());
}

export function pruneChallenges(maxAgeMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [k, v] of challenges.entries()) {
    if (now - v.createdAt > maxAgeMs) challenges.delete(k);
  }
}

// @ts-nocheck
import crypto from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WIF = process.env.TEST_USER_WIF || '';

if (!WIF) throw new Error('Set TEST_USER_WIF for demo showcase flow.');

function hash256Hex(input: string) {
  const first = crypto.createHash('sha256').update(input).digest();
  return crypto.createHash('sha256').update(first).digest('hex');
}

const userSeed = `${crypto.randomUUID()}:${Date.now()}`;
const nonce = 'demo-showcase';
const commitmentHash = hash256Hex(`${userSeed}:${nonce}`);

const commitRes = await fetch(`${BASE_URL}/api/commit-pack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wif: WIF, commitmentHash })
});
const commitJson: any = await commitRes.json();
if (!commitRes.ok) throw new Error(`commit-pack failed: ${commitJson.error}`);

const revealRes = await fetch(`${BASE_URL}/api/reveal-pack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wif: WIF, userSeed, nonce, pending: commitJson })
});
const revealJson: any = await revealRes.json();
if (!revealRes.ok) throw new Error(`reveal-pack failed: ${revealJson.error}`);

const hasDiamond = revealJson.cards.some((c: any) => c.tier === 'Diamond');
console.log('SHOWCASE REVEAL:', revealJson.revealTxid, revealJson.cards.map((c: any) => `${c.tier}:${c.faceValueSats}`).join(', '));
if (!hasDiamond) {
  throw new Error('Demo showcase mode expected a Diamond pull but none found. Set DEMO_SHOWCASE_MODE=true');
}
console.log('Showcase success: Diamond pull confirmed.');

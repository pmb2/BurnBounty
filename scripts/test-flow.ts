// @ts-nocheck
import crypto from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WIF = process.env.TEST_USER_WIF || '';

if (!WIF) throw new Error('Set TEST_USER_WIF for test-flow script.');

function hash256Hex(input: string) {
  const first = crypto.createHash('sha256').update(input).digest();
  return crypto.createHash('sha256').update(first).digest('hex');
}

const userSeed = `${crypto.randomUUID()}:${Date.now()}`;
const nonce = crypto.randomUUID().slice(0, 12);
const commitmentHash = hash256Hex(`${userSeed}:${nonce}`);

const commitRes = await fetch(`${BASE_URL}/api/commit-pack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wif: WIF, commitmentHash })
});
const commitJson: any = await commitRes.json();
if (!commitRes.ok) throw new Error(`commit-pack failed: ${commitJson.error}`);
console.log('COMMIT RESULT:', commitJson.commitTxid, 'deadline', commitJson.revealDeadline);

const revealRes = await fetch(`${BASE_URL}/api/reveal-pack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wif: WIF, userSeed, nonce, pending: commitJson })
});
const revealJson: any = await revealRes.json();
if (!revealRes.ok) throw new Error(`reveal-pack failed: ${revealJson.error}`);
console.log('REVEAL RESULT:', revealJson.revealTxid, revealJson.cards.map((c: any) => `${c.tier}:${c.faceValueSats}`).join(', '));

const redeemRes = await fetch(`${BASE_URL}/api/redeem`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wif: WIF, card: revealJson.cards[0] })
});
const redeemJson: any = await redeemRes.json();
if (!redeemRes.ok) throw new Error(`redeem failed: ${redeemJson.error}`);
console.log('REDEEM RESULT:', redeemJson.txid, `payout=${redeemJson.payout}`, `houseCut=${redeemJson.houseCut}`);

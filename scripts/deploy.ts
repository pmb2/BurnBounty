// @ts-nocheck
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Contract, ElectrumNetworkProvider } from 'cashscript';

const PACK_PRICE_SATS = Number(process.env.PACK_PRICE_SATS || 100_000);
const PACK_HOUSE_CUT_SATS = Math.floor(PACK_PRICE_SATS * 0.2);
const HOUSE_PKH = process.env.HOUSE_PKH || '';
const PRIZE_POOL_PKH = process.env.PRIZE_POOL_PKH || HOUSE_PKH;
const TOKEN_CATEGORY = process.env.TOKEN_CATEGORY || '00'.repeat(32);
const CHIPNET_ELECTRUM = process.env.CHIPNET_ELECTRUM || 'chipnet.imaginary.cash:50004';
const REVEAL_WINDOW_BLOCKS = Number(process.env.REVEAL_WINDOW_BLOCKS || 6);

if (!HOUSE_PKH || !PRIZE_POOL_PKH) throw new Error('Missing HOUSE_PKH / PRIZE_POOL_PKH.');

const provider = new ElectrumNetworkProvider('chipnet', CHIPNET_ELECTRUM);
const artifactsDir = path.join(process.cwd(), 'artifacts');

const commitArtifact = JSON.parse(readFileSync(path.join(artifactsDir, 'PackCommit.artifact.json'), 'utf8'));
const revealArtifact = JSON.parse(readFileSync(path.join(artifactsDir, 'PackReveal.artifact.json'), 'utf8'));
const poolArtifact = JSON.parse(readFileSync(path.join(artifactsDir, 'PrizePool.artifact.json'), 'utf8'));
const redeemerArtifact = JSON.parse(readFileSync(path.join(artifactsDir, 'CardRedeemer.artifact.json'), 'utf8'));

const cardRedeemer = new Contract(redeemerArtifact, [PRIZE_POOL_PKH], provider);
const prizePool = new Contract(poolArtifact, [HOUSE_PKH, cardRedeemer.bytecode], provider);
const packReveal = new Contract(revealArtifact, [REVEAL_WINDOW_BLOCKS, PRIZE_POOL_PKH, TOKEN_CATEGORY, PACK_HOUSE_CUT_SATS], provider);
const packCommit = new Contract(commitArtifact, [PACK_PRICE_SATS, packReveal.bytecode], provider);

console.log(JSON.stringify({
  chipnet: true,
  packCommitAddress: packCommit.address,
  packRevealAddress: packReveal.address,
  prizePoolAddress: prizePool.address,
  cardRedeemerAddress: cardRedeemer.address,
  params: {
    packPriceSats: PACK_PRICE_SATS,
    revealWindowBlocks: REVEAL_WINDOW_BLOCKS,
    packHouseCutSats: PACK_HOUSE_CUT_SATS
  },
  odds: {
    Bronze: '70%',
    Silver: '20%',
    Gold: '8%',
    Diamond: '2%'
  }
}, null, 2));

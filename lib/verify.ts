import { deriveEntropyRoot, generateBatchCards, generateCardsFromEntropy } from '@/lib/rng';
import type { PackSeries } from '@/types/cards';

export function verifyCardGeneration(input: {
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
  series?: PackSeries;
}) {
  const entropyRoot = deriveEntropyRoot(input);
  const cards = generateCardsFromEntropy(entropyRoot, 5, input.series || 'NORMAL');
  return { entropyRoot, cards };
}

export function verifyBatchCardGeneration(inputs: Array<{
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
  series?: PackSeries;
}>) {
  const roots = inputs.map((i) => deriveEntropyRoot(i));
  return {
    entropyRoots: roots,
    cards: generateBatchCards(roots, 5, inputs[0]?.series || 'NORMAL')
  };
}

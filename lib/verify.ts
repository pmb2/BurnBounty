import { deriveEntropyRoot, generateBatchCards, generateCardsFromEntropy } from '@/lib/rng';

export function verifyCardGeneration(input: {
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
}) {
  const entropyRoot = deriveEntropyRoot(input);
  const cards = generateCardsFromEntropy(entropyRoot, 5);
  return { entropyRoot, cards };
}

export function verifyBatchCardGeneration(inputs: Array<{
  userSeed: string;
  nonce: string;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
  commitTxid: string;
}>) {
  const roots = inputs.map((i) => deriveEntropyRoot(i));
  return {
    entropyRoots: roots,
    cards: generateBatchCards(roots, 5)
  };
}

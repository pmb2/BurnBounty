export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
export type PackSeries = 'GENESIS_BETA' | 'FOUNDER_EDITION' | 'NORMAL';

export interface CardAsset {
  nftId: string;
  categoryId: string;
  commitmentHex: string;
  name: string;
  tier: Tier;
  series: PackSeries;
  faceValueSats: number;
  originalFaceValueSats: number;
  payoutSats: number;
  payoutBch: number;
  weeklyDriftMilli: number;
  randomCapWeeks: number;
  mintBlockHeight: number;
  serial: string;
  image: string;
  bcmrUri: string;
}

export interface PendingPack {
  commitTxid: string;
  commitHeight: number;
  commitmentHash: string;
  userAddress: string;
  series: PackSeries;
  packPriceSats: number;
  blockHashN: string;
  blockHashN1: string;
  blockHashN2: string;
}

export interface CommitPackResult extends PendingPack {
  revealDeadline: number;
}

export interface RevealPackResult {
  revealTxid: string;
  cards: CardAsset[];
  entropyRoot: string;
  commitmentHash: string;
  seedReveal: {
    userSeed: string;
    nonce: string;
  };
  blockHashes: {
    n: string;
    n1: string;
    n2: string;
  };
}

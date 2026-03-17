export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

export interface CardAsset {
  nftId: string;
  categoryId: string;
  commitmentHex: string;
  name: string;
  tier: Tier;
  faceValueSats: number;
  payoutSats: number;
  payoutBch: number;
  serial: string;
  image: string;
  bcmrUri: string;
}

export interface PendingPack {
  commitTxid: string;
  commitHeight: number;
  commitmentHash: string;
  userAddress: string;
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

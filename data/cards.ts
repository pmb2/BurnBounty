import type { Tier } from '@/types/cards';

export interface CardTemplate {
  id: string;
  name: string;
  tier: Tier;
  prompt: string;
  image: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: 'gold-satoshi-diamond', name: 'Satoshi Diamond Sigil', tier: 'Gold', image: '/cards/3LjTX.jpg', prompt: 'Gold bordered portrait of Satoshi in crystalline cyberpunk frame, dramatic rim light, premium trading card art' },
  { id: 'silver-node-future', name: 'Future Node Architect', tier: 'Silver', image: '/cards/BviE3.jpg', prompt: 'Silver metallic BCH full node core with holographic city, realistic digital painting, TCG card composition' },
  { id: 'bronze-classic-portrait', name: 'Classic BCH Pioneer', tier: 'Bronze', image: '/cards/cNM6x.jpg', prompt: 'Bronze engraved portrait in vintage money style with tech motifs, textured print look' },
  { id: 'bronze-desert-relay', name: 'Desert Relay Tower', tier: 'Bronze', image: '/cards/ENx7h.jpg', prompt: 'Bronze card, BCH relay tower in desert sunset, cinematic digital painting, collectible card' },
  { id: 'bronze-ledger-smith', name: 'Ledger Smith', tier: 'Bronze', image: '/cards/gGOKq.jpg', prompt: 'Bronze frame, artisan forging hardware wallet, dramatic sparks, painterly concept art' },
  { id: 'bronze-market-street', name: 'Market Street Merchant', tier: 'Bronze', image: '/cards/iATcX.jpg', prompt: 'Bronze border, street merchant accepting BCH with qr display, warm texture' },
  { id: 'bronze-hash-lab', name: 'Hash Lab Apprentice', tier: 'Bronze', image: '/cards/IdgQ5.jpg', prompt: 'Bronze retro-futurist laboratory scene with BCH equations and glowing terminals' },
  { id: 'bronze-miner-camp', name: 'Miner Camp Dawn', tier: 'Bronze', image: '/cards/mOV8D.jpg', prompt: 'Bronze mining camp at sunrise, rugged style, collectible card frame' },
  { id: 'bronze-circuit-scribe', name: 'Circuit Scribe', tier: 'Bronze', image: '/cards/nxDE5.jpg', prompt: 'Bronze engraved scribe drafting circuit-like scrolls, fantasy-tech fusion' },
  { id: 'silver-bridge-runner', name: 'Bridge Runner', tier: 'Silver', image: '/cards/pij6C.jpg', prompt: 'Silver border courier sprinting across neon bridge transferring BCH payment stream' },
  { id: 'silver-chain-cartographer', name: 'Chain Cartographer', tier: 'Silver', image: '/cards/r4AbP.jpg', prompt: 'Silver border cartographer mapping global BCH routes on holographic map' },
  { id: 'silver-vault-sentinel', name: 'Vault Sentinel', tier: 'Silver', image: '/cards/w8adD.jpg', prompt: 'Silver armored sentinel guarding BCH vault core, high detail digital art' },
  { id: 'silver-merchant-guild', name: 'Merchant Guild', tier: 'Silver', image: '/cards/ZdyfA.jpg', prompt: 'Silver card showing guild hall with BCH marketplace banners and polished metal trim' },
  { id: 'silver-latency-slasher', name: 'Latency Slasher', tier: 'Silver', image: '/cards/3LjTX.jpg', prompt: 'Silver border cyber blade slicing network latency waveforms, energetic composition' },
  { id: 'gold-consensus-warden', name: 'Consensus Warden', tier: 'Gold', image: '/cards/BviE3.jpg', prompt: 'Gold glowing guardian over BCH consensus wheel, epic fantasy-tech painting' },
  { id: 'gold-liquidity-sage', name: 'Liquidity Sage', tier: 'Gold', image: '/cards/cNM6x.jpg', prompt: 'Gold card with sage commanding flowing BCH liquidity streams, ornate lighting' },
  { id: 'gold-epoch-forge', name: 'Epoch Forge', tier: 'Gold', image: '/cards/ENx7h.jpg', prompt: 'Gold metallic forge creating legendary BCH relic, volumetric sparks and smoke' },
  { id: 'diamond-genesis-oracle', name: 'Genesis Oracle', tier: 'Diamond', image: '/cards/gGOKq.jpg', prompt: 'Diamond tier celestial oracle projecting genesis block constellation, ultra-lux card art' },
  { id: 'diamond-infinity-mint', name: 'Infinity Mint Engine', tier: 'Diamond', image: '/cards/iATcX.jpg', prompt: 'Diamond frame around impossible mint engine of light, top-tier premium collectible style' },
  { id: 'diamond-borderless-satoshi', name: 'Borderless Satoshi Prime', tier: 'Diamond', image: '/cards/IdgQ5.jpg', prompt: 'Diamond hyper-detailed iconic Satoshi portrait with refractive prism effects, prestige card' }
];

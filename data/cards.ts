import type { Tier } from '@/types/cards';

export interface CardTemplate {
  id: string;
  name: string;
  tier: Tier;
  prompt: string;
  image: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: 'gold-satoshi-diamond', name: 'Satoshi Diamond Sigil', tier: 'Gold', image: '/cards/gold-satoshi-diamond.svg', prompt: 'Gold bordered portrait of Satoshi in crystalline cyberpunk frame, dramatic rim light, premium trading card art' },
  { id: 'silver-node-future', name: 'Future Node Architect', tier: 'Silver', image: '/cards/silver-node-future.svg', prompt: 'Silver metallic BCH full node core with holographic city, realistic digital painting, TCG card composition' },
  { id: 'bronze-classic-portrait', name: 'Classic BCH Pioneer', tier: 'Bronze', image: '/cards/bronze-classic-portrait.svg', prompt: 'Bronze engraved portrait in vintage money style with tech motifs, textured print look' },
  { id: 'bronze-desert-relay', name: 'Desert Relay Tower', tier: 'Bronze', image: '/cards/bronze-desert-relay.svg', prompt: 'Bronze card, BCH relay tower in desert sunset, cinematic digital painting, collectible card' },
  { id: 'bronze-ledger-smith', name: 'Ledger Smith', tier: 'Bronze', image: '/cards/bronze-ledger-smith.svg', prompt: 'Bronze frame, artisan forging hardware wallet, dramatic sparks, painterly concept art' },
  { id: 'bronze-market-street', name: 'Market Street Merchant', tier: 'Bronze', image: '/cards/bronze-market-street.svg', prompt: 'Bronze border, street merchant accepting BCH with qr display, warm texture' },
  { id: 'bronze-hash-lab', name: 'Hash Lab Apprentice', tier: 'Bronze', image: '/cards/bronze-hash-lab.svg', prompt: 'Bronze retro-futurist laboratory scene with BCH equations and glowing terminals' },
  { id: 'bronze-miner-camp', name: 'Miner Camp Dawn', tier: 'Bronze', image: '/cards/bronze-miner-camp.svg', prompt: 'Bronze mining camp at sunrise, rugged style, collectible card frame' },
  { id: 'bronze-circuit-scribe', name: 'Circuit Scribe', tier: 'Bronze', image: '/cards/bronze-circuit-scribe.svg', prompt: 'Bronze engraved scribe drafting circuit-like scrolls, fantasy-tech fusion' },
  { id: 'silver-bridge-runner', name: 'Bridge Runner', tier: 'Silver', image: '/cards/silver-bridge-runner.svg', prompt: 'Silver border courier sprinting across neon bridge transferring BCH payment stream' },
  { id: 'silver-chain-cartographer', name: 'Chain Cartographer', tier: 'Silver', image: '/cards/silver-chain-cartographer.svg', prompt: 'Silver border cartographer mapping global BCH routes on holographic map' },
  { id: 'silver-vault-sentinel', name: 'Vault Sentinel', tier: 'Silver', image: '/cards/silver-vault-sentinel.svg', prompt: 'Silver armored sentinel guarding BCH vault core, high detail digital art' },
  { id: 'silver-merchant-guild', name: 'Merchant Guild', tier: 'Silver', image: '/cards/silver-merchant-guild.svg', prompt: 'Silver card showing guild hall with BCH marketplace banners and polished metal trim' },
  { id: 'silver-latency-slasher', name: 'Latency Slasher', tier: 'Silver', image: '/cards/silver-latency-slasher.svg', prompt: 'Silver border cyber blade slicing network latency waveforms, energetic composition' },
  { id: 'gold-consensus-warden', name: 'Consensus Warden', tier: 'Gold', image: '/cards/gold-consensus-warden.svg', prompt: 'Gold glowing guardian over BCH consensus wheel, epic fantasy-tech painting' },
  { id: 'gold-liquidity-sage', name: 'Liquidity Sage', tier: 'Gold', image: '/cards/gold-liquidity-sage.svg', prompt: 'Gold card with sage commanding flowing BCH liquidity streams, ornate lighting' },
  { id: 'gold-epoch-forge', name: 'Epoch Forge', tier: 'Gold', image: '/cards/gold-epoch-forge.svg', prompt: 'Gold metallic forge creating legendary BCH relic, volumetric sparks and smoke' },
  { id: 'diamond-genesis-oracle', name: 'Genesis Oracle', tier: 'Diamond', image: '/cards/diamond-genesis-oracle.svg', prompt: 'Diamond tier celestial oracle projecting genesis block constellation, ultra-lux card art' },
  { id: 'diamond-infinity-mint', name: 'Infinity Mint Engine', tier: 'Diamond', image: '/cards/diamond-infinity-mint.svg', prompt: 'Diamond frame around impossible mint engine of light, top-tier premium collectible style' },
  { id: 'diamond-borderless-satoshi', name: 'Borderless Satoshi Prime', tier: 'Diamond', image: '/cards/diamond-borderless-satoshi.svg', prompt: 'Diamond hyper-detailed iconic Satoshi portrait with refractive prism effects, prestige card' }
];
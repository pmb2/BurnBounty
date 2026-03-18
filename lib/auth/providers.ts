import type { WalletProviderKind, WalletSignMode } from '@/types/auth';

export interface WalletProviderCapabilities {
  canSignAuthMessage: boolean;
  canSignArbitraryMessage: boolean;
  requiresManualSignaturePaste: boolean;
}

export interface WalletProviderDefinition {
  id: WalletProviderKind;
  name: string;
  description: string;
  authPriority: 'primary' | 'secondary' | 'experimental';
  signModes: WalletSignMode[];
  capabilities: WalletProviderCapabilities;
}

export const WALLET_PROVIDER_DEFINITIONS: WalletProviderDefinition[] = [
  {
    id: 'embedded',
    name: 'Embedded Wallet',
    description: 'Fast onboarding wallet generated in-browser and encrypted locally.',
    authPriority: 'primary',
    signModes: ['manual'],
    capabilities: {
      canSignAuthMessage: true,
      canSignArbitraryMessage: true,
      requiresManualSignaturePaste: false
    }
  },
  {
    id: 'external_bch',
    name: 'External BCH Wallet',
    description: 'Bring your own BCH wallet via manual/deep-link signature challenge.',
    authPriority: 'secondary',
    signModes: ['paytaca', 'electrum', 'manual'],
    capabilities: {
      canSignAuthMessage: true,
      canSignArbitraryMessage: true,
      requiresManualSignaturePaste: true
    }
  },
  {
    id: 'metamask_snap',
    name: 'MetaMask Snap',
    description: 'Optional experimental BCH-compatible identity bridge.',
    authPriority: 'experimental',
    signModes: ['metamask_snap'],
    capabilities: {
      canSignAuthMessage: true,
      canSignArbitraryMessage: true,
      requiresManualSignaturePaste: false
    }
  }
];

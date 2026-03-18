import manifest from '@/data/3d-assets.json';
import type { ImmersiveAssetEntry, ImmersiveAssetManifest } from '@/types/immersive';

export const IMMERSIVE_MANIFEST = manifest as ImmersiveAssetManifest;

export const IMMERSIVE_SCENE_SLOTS = ['scene.board', 'scene.props', 'scene.interactive'] as const;

export type ImmersiveSceneSlot = (typeof IMMERSIVE_SCENE_SLOTS)[number];

export function filePathToPublicUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('public/')) return normalized.slice('public'.length);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function getImmersiveAssetBySlot(slot: ImmersiveSceneSlot): ImmersiveAssetEntry | null {
  return IMMERSIVE_MANIFEST.assets.find((asset) => asset.slot === slot) ?? null;
}


export type ImmersiveAssetStatus = 'placeholder' | 'ready' | 'deprecated';

export type ImmersiveAssetEntry = {
  id: string;
  name: string;
  slot: string;
  source: string;
  status: ImmersiveAssetStatus;
  file: string;
  thumbnail?: string;
  maxSizeMb: number;
  maxTriangles?: number;
  license?: string;
};

export type ImmersiveAssetManifest = {
  version: string;
  updatedAt: string;
  notes?: string;
  assets: ImmersiveAssetEntry[];
};


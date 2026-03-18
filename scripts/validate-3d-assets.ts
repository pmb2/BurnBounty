import fs from 'node:fs';
import path from 'node:path';

type AssetStatus = 'placeholder' | 'ready' | 'deprecated';

type AssetEntry = {
  id: string;
  name: string;
  slot: string;
  source: string;
  status: AssetStatus;
  file: string;
  thumbnail?: string;
  maxSizeMb: number;
  maxTriangles?: number;
  license?: string;
};

type AssetManifest = {
  version: string;
  updatedAt: string;
  notes?: string;
  assets: AssetEntry[];
};

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, 'data', '3d-assets.json');

function fail(message: string): never {
  throw new Error(message);
}

function readManifest(): AssetManifest {
  if (!fs.existsSync(manifestPath)) {
    fail(`Manifest missing: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as AssetManifest;
  if (!Array.isArray(parsed.assets)) {
    fail('Invalid manifest: assets[] must be present');
  }
  return parsed;
}

function isSupportedAssetFile(filePath: string) {
  return filePath.endsWith('.glb') || filePath.endsWith('.gltf');
}

function validateEntry(entry: AssetEntry) {
  if (!entry.id || !entry.file || !entry.status) {
    fail(`Invalid asset entry (id/file/status required): ${JSON.stringify(entry)}`);
  }

  if (!isSupportedAssetFile(entry.file)) {
    fail(`Unsupported asset extension for ${entry.id}. Expected .glb or .gltf, got: ${entry.file}`);
  }

  const absoluteFile = path.join(projectRoot, entry.file);
  const exists = fs.existsSync(absoluteFile);
  if (entry.status === 'ready' && !exists) {
    fail(`Asset ${entry.id} marked ready but file missing: ${entry.file}`);
  }

  if (exists) {
    const stat = fs.statSync(absoluteFile);
    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb > entry.maxSizeMb) {
      fail(`Asset ${entry.id} exceeds maxSizeMb (${sizeMb.toFixed(2)}MB > ${entry.maxSizeMb}MB)`);
    }
  }
}

function main() {
  const manifest = readManifest();
  manifest.assets.forEach(validateEntry);

  const readyCount = manifest.assets.filter((a) => a.status === 'ready').length;
  const placeholderCount = manifest.assets.filter((a) => a.status === 'placeholder').length;

  console.log(`[3d-assets] manifest=${manifest.version} ready=${readyCount} placeholder=${placeholderCount}`);
  console.log('[3d-assets] validation passed');
}

main();

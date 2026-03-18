'use client';

import { useEffect, useState } from 'react';
import { filePathToPublicUrl, IMMERSIVE_MANIFEST, IMMERSIVE_SCENE_SLOTS } from '@/lib/immersive-assets';
import type { ImmersiveSceneSlot } from '@/lib/immersive-assets';

type RuntimeState = Record<ImmersiveSceneSlot, boolean>;

const slotLabels: Record<ImmersiveSceneSlot, string> = {
  'scene.board': 'Bounty Board',
  'scene.props': 'Desk Props',
  'scene.interactive': 'Interactive Prop'
};

export function ImmersiveAssetStatus() {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    'scene.board': false,
    'scene.props': false,
    'scene.interactive': false
  });

  useEffect(() => {
    let live = true;

    const entries = IMMERSIVE_SCENE_SLOTS.map((slot) => ({
      slot,
      asset: IMMERSIVE_MANIFEST.assets.find((candidate) => candidate.slot === slot)
    }));

    Promise.all(
      entries.map(async ({ slot, asset }) => {
        if (!asset || asset.status !== 'ready') {
          return { slot, ready: false };
        }
        try {
          const res = await fetch(filePathToPublicUrl(asset.file), { method: 'HEAD' });
          return { slot, ready: res.ok };
        } catch {
          return { slot, ready: false };
        }
      })
    )
      .then((results) => {
        if (!live) return;
        const next: RuntimeState = {
          'scene.board': false,
          'scene.props': false,
          'scene.interactive': false
        };
        results.forEach((result) => {
          next[result.slot] = result.ready;
        });
        setRuntimeState(next);
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, []);

  return (
    <aside className="bounty-paper rounded-2xl border border-amber-400/35 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">Immersive Asset Ops</h3>
        <span className="rounded border border-emerald-300/45 bg-emerald-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100">
          v{IMMERSIVE_MANIFEST.version}
        </span>
      </div>
      <div className="space-y-2 text-xs">
        {IMMERSIVE_SCENE_SLOTS.map((slot) => {
          const asset = IMMERSIVE_MANIFEST.assets.find((candidate) => candidate.slot === slot);
          const manifestReady = asset?.status === 'ready';
          const runtimeReady = runtimeState[slot];
          const stateLabel = runtimeReady ? 'Live' : manifestReady ? 'Missing file' : 'Placeholder';
          const stateClass = runtimeReady
            ? 'border-emerald-300/45 bg-emerald-500/20 text-emerald-100'
            : manifestReady
              ? 'border-red-300/45 bg-red-500/15 text-red-100'
              : 'border-amber-300/35 bg-amber-500/15 text-amber-100';

          return (
            <div key={slot} className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-zinc-200">{slotLabels[slot]}</span>
                <span className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${stateClass}`}>{stateLabel}</span>
              </div>
              <p className="truncate text-zinc-400">{asset?.id || 'Unassigned slot'}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">Drop validated `.glb/.gltf` assets in `public/3d` and run `npm run assets:3d:validate`.</p>
    </aside>
  );
}

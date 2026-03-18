# 3D Asset Pipeline (BurnBounty)

## Goal
Ship immersive 3D scenes incrementally without blocking gameplay reliability.

## Source -> Runtime Pipeline
1. Generate model candidates in Trellis/Hunyuan.
2. Refine in Blender (topology cleanup, UV, materials, LOD).
3. Export `.glb` (preferred) or `.gltf`.
4. Place assets under:
   - `public/3d/scenes`
   - `public/3d/props`
   - `public/3d/cards`
5. Register/update entries in `data/3d-assets.json`.
6. Run validation:
   - `npm run assets:3d:validate`
7. Wire into scene components (`BountyWorldScene`, pack/reveal sequences).

## Conventions
- Use lowercase kebab-case file names.
- Keep major scene assets under 8MB each.
- Keep prop assets under 6MB each.
- Prefer baked textures and compact material sets.
- Commit source metadata (not raw generation prompts with secrets).

## Manifest Rules
Each asset entry must include:
- `id`, `name`, `slot`, `source`
- `status`: `placeholder | ready | deprecated`
- `file`, `maxSizeMb`

When `status=ready`, `file` must exist and pass size checks.

## Runtime Strategy
- Current phase uses a synthetic 3D world scaffold (`components/BountyWorldScene.tsx`) so UX is already immersive.
- Real GLB assets can replace primitives slot-by-slot without route refactors.
- Keep WebGL fallback behavior for low-end/unsupported clients.

## Suggested First Assets
1. `board-main.glb` -> slot `scene.board`
2. `desk-props-set.glb` -> slot `scene.props`
3. `card-pack-crate.glb` -> slot `scene.interactive`

## Safety and Performance
- Never block auth/commit/reveal flows on asset load success.
- No secrets in asset metadata files.
- Add LOD versions for heavy models when loading in gameplay-critical screens.

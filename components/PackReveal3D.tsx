'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CardAsset } from '@/types/cards';

type Props = {
  cards: CardAsset[];
  revealed: boolean;
};

function tierColor(tier: string) {
  if (tier === 'Diamond') return '#6be9ff';
  if (tier === 'Gold') return '#ffde65';
  if (tier === 'Silver') return '#c9d3e0';
  return '#bc7d49';
}

function CardMesh({ card, i, revealed }: { card: CardAsset; i: number; revealed: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    if (!group.current) return;
    const targetY = revealed ? 0 : Math.PI;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 6, dt);
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8 + i) * 0.08;
  });

  const x = -3.2 + i * 1.6;

  return (
    <Float speed={1.2 + i * 0.2} rotationIntensity={0.15} floatIntensity={0.75}>
      <group ref={group} position={[x, 0, 0]}>
        <RoundedBox args={[1.05, 1.45, 0.06]} radius={0.08} smoothness={5}>
          <meshStandardMaterial color={revealed ? tierColor(card.tier) : '#1b2a3d'} metalness={0.35} roughness={0.25} />
        </RoundedBox>
        {revealed && (
          <Html center transform distanceFactor={5.7} position={[0, 0, 0.05]}>
            <div className="pointer-events-none w-24 rounded-md border border-white/40 bg-black/45 px-2 py-1 text-center text-[10px] text-white">
              <p className="font-semibold">{card.tier}</p>
              <p>{(card.faceValueSats / 1e8).toFixed(4)} BCH</p>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
}

export function PackReveal3D({ cards, revealed }: Props) {
  const localCards = useMemo(
    () =>
      cards.length
        ? cards.slice(0, 5)
        : Array.from({ length: 5 }).map((_, i) => ({
            nftId: `placeholder-${i}`,
            categoryId: '',
            commitmentHex: '',
            name: 'Hidden',
            tier: 'Bronze',
            faceValueSats: 0,
            payoutSats: 0,
            payoutBch: 0,
            serial: '',
            image: '',
            bcmrUri: ''
          } as CardAsset)),
    [cards]
  );

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-b from-cyan-500/10 to-indigo-500/5">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[2, 4, 6]} intensity={1.4} />
        <Environment preset="city" />
        {localCards.map((card, i) => (
          <CardMesh key={card.nftId} card={card} i={i} revealed={revealed} />
        ))}
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!revealed} autoRotateSpeed={1.4} />
      </Canvas>
    </div>
  );
}

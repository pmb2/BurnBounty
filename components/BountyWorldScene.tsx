'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { filePathToPublicUrl, getImmersiveAssetBySlot } from '@/lib/immersive-assets';

type SlotAvailability = {
  boardReady: boolean;
  propsReady: boolean;
  interactiveReady: boolean;
};

function AmbientProps({
  showBoard = true,
  showProps = true,
  showInteractive = true
}: {
  showBoard?: boolean;
  showProps?: boolean;
  showInteractive?: boolean;
}) {
  const signRef = useRef<THREE.Mesh>(null);
  const coinRef = useRef<THREE.Mesh>(null);

  useFrame((state, dt) => {
    if (signRef.current) {
      signRef.current.rotation.y = THREE.MathUtils.damp(signRef.current.rotation.y, Math.sin(state.clock.elapsedTime * 0.45) * 0.22, 4, dt);
    }
    if (coinRef.current) {
      coinRef.current.rotation.y += dt * 0.9;
      coinRef.current.position.y = 0.95 + Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
    }
  });

  return (
    <>
      {showBoard && (
        <RoundedBox args={[5.2, 3.2, 0.22]} radius={0.06} smoothness={4} position={[0, 0.85, -0.9]}>
          <meshStandardMaterial color="#2c1c15" roughness={0.72} metalness={0.15} />
        </RoundedBox>
      )}

      <RoundedBox ref={signRef as any} args={[2.4, 0.55, 0.08]} radius={0.04} smoothness={4} position={[0, 2.35, -0.48]}>
        <meshStandardMaterial color="#c67a3f" emissive="#ff8f35" emissiveIntensity={0.22} metalness={0.2} roughness={0.35} />
      </RoundedBox>

      {showProps && (
        <RoundedBox args={[4.8, 0.2, 1.6]} radius={0.04} smoothness={4} position={[0, -0.95, 0]}>
          <meshStandardMaterial color="#1f1714" metalness={0.08} roughness={0.82} />
        </RoundedBox>
      )}

      {showInteractive && (
        <mesh ref={coinRef as any} position={[1.95, 0.95, 0.25]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 42]} />
          <meshStandardMaterial color="#33d17a" emissive="#1f9f5a" emissiveIntensity={0.42} metalness={0.7} roughness={0.22} />
        </mesh>
      )}

      {showProps &&
        [-1.45, -0.7, 0.05, 0.82, 1.55].map((x, idx) => (
          <Float key={x} speed={1 + idx * 0.24} rotationIntensity={0.18} floatIntensity={0.58}>
            <RoundedBox args={[0.56, 0.78, 0.06]} radius={0.05} smoothness={4} position={[x, 0.05 + idx * 0.02, 0.2 - idx * 0.05]}>
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#2f2118' : '#3a291f'}
                emissive={idx % 2 === 0 ? '#4e2f1b' : '#2a3124'}
                emissiveIntensity={0.2}
                metalness={0.2}
                roughness={0.58}
              />
            </RoundedBox>
          </Float>
        ))}
    </>
  );
}

function WorldAssetModel({
  url,
  position,
  scale,
  rotation
}: {
  url: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} position={position} scale={scale} rotation={rotation} />;
}

export function BountyWorldScene() {
  const boardAsset = getImmersiveAssetBySlot('scene.board');
  const propsAsset = getImmersiveAssetBySlot('scene.props');
  const interactiveAsset = getImmersiveAssetBySlot('scene.interactive');

  const [availability, setAvailability] = useState<SlotAvailability>({
    boardReady: false,
    propsReady: false,
    interactiveReady: false
  });

  useEffect(() => {
    let live = true;
    const checks: Array<Promise<void>> = [];

    const slotTargets = [
      {
        key: 'boardReady' as const,
        assetFile: boardAsset && boardAsset.status === 'ready' ? filePathToPublicUrl(boardAsset.file) : null
      },
      {
        key: 'propsReady' as const,
        assetFile: propsAsset && propsAsset.status === 'ready' ? filePathToPublicUrl(propsAsset.file) : null
      },
      {
        key: 'interactiveReady' as const,
        assetFile: interactiveAsset && interactiveAsset.status === 'ready' ? filePathToPublicUrl(interactiveAsset.file) : null
      }
    ];

    slotTargets.forEach(({ key, assetFile }) => {
      if (!assetFile) return;
      checks.push(
        fetch(assetFile, { method: 'HEAD' })
          .then((res) => {
            if (!live) return;
            setAvailability((current) => ({ ...current, [key]: res.ok }));
          })
          .catch(() => {
            if (!live) return;
            setAvailability((current) => ({ ...current, [key]: false }));
          })
      );
    });

    Promise.allSettled(checks).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [boardAsset, propsAsset, interactiveAsset]);

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1f130f]/65 to-[#090a0d]/85">
      <Canvas camera={{ position: [0, 1.15, 5.4], fov: 44 }}>
        <fog attach="fog" args={['#090a0d', 4.2, 11]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 3]} intensity={1.35} color="#ffd2a4" />
        <pointLight position={[-2, 1.7, 1.4]} intensity={0.8} color="#36d17f" />
        <pointLight position={[1.9, 2, 1.2]} intensity={0.9} color="#f28f3b" />
        <Environment preset="warehouse" />
        <AmbientProps
          showBoard={!availability.boardReady}
          showProps={!availability.propsReady}
          showInteractive={!availability.interactiveReady}
        />
        {availability.boardReady && boardAsset && (
          <Suspense fallback={null}>
            <WorldAssetModel
              url={filePathToPublicUrl(boardAsset.file)}
              position={[0, -0.4, -0.6]}
              scale={[1.45, 1.45, 1.45]}
            />
          </Suspense>
        )}
        {availability.propsReady && propsAsset && (
          <Suspense fallback={null}>
            <WorldAssetModel
              url={filePathToPublicUrl(propsAsset.file)}
              position={[0.2, -0.62, 0.2]}
              scale={[1, 1, 1]}
            />
          </Suspense>
        )}
        {availability.interactiveReady && interactiveAsset && (
          <Suspense fallback={null}>
            <WorldAssetModel
              url={filePathToPublicUrl(interactiveAsset.file)}
              position={[1.2, -0.65, 0.95]}
              scale={[0.7, 0.7, 0.7]}
              rotation={[0, 0.4, 0]}
            />
          </Suspense>
        )}
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.55} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 2.7} />
      </Canvas>
    </div>
  );
}

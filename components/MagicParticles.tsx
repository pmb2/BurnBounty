'use client';

export function MagicParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className="magic-dot"
          style={{
            left: `${(i * 17) % 100}%`,
            animationDelay: `${(i % 7) * 0.4}s`,
            animationDuration: `${6 + (i % 5)}s`
          }}
        />
      ))}
    </div>
  );
}

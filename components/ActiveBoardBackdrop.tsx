'use client';

import { useMemo } from 'react';

type ActiveBoardBackdropProps = {
  className?: string;
  density?: 'low' | 'medium' | 'high';
};

const statusLines = [
  'Hunter Relay: online',
  'Bounty Feed: synced',
  'CashTokens Node: healthy',
  'Commit-Reveal Engine: armed'
];

export function ActiveBoardBackdrop({ className = '', density = 'medium' }: ActiveBoardBackdropProps) {
  const lineCount = density === 'high' ? 14 : density === 'low' ? 6 : 10;
  const lines = useMemo(
    () =>
      Array.from({ length: lineCount }).map((_, i) => ({
        id: i,
        left: `${(i * 13.7) % 100}%`,
        delay: `${(i * 0.45).toFixed(2)}s`,
        duration: `${(4 + (i % 4) * 1.2).toFixed(2)}s`
      })),
    [lineCount]
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`} aria-hidden="true">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/bg/burnbounty-board.png"
      >
        <source src="/bg/burnbounty-loop.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.22),transparent_38%),linear-gradient(180deg,rgba(7,7,8,0.32),rgba(7,7,8,0.8))]" />

      <div className="absolute right-3 top-3 hidden rounded-lg border border-emerald-300/40 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-100 md:block">
        {statusLines[Math.floor(Date.now() / 1000) % statusLines.length]}
      </div>

      <div className="absolute inset-0 opacity-25">
        {lines.map((line) => (
          <span
            key={line.id}
            className="active-board-line absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-300 to-transparent"
            style={{ left: line.left, animationDelay: line.delay, animationDuration: line.duration }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}

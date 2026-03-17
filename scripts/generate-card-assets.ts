import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CARD_TEMPLATES } from '../data/cards';

const outDir = path.join(process.cwd(), 'public', 'cards');
mkdirSync(outDir, { recursive: true });

const tierTheme = {
  Bronze: { border: '#a66a3a', glow: '#8f5e34', fillA: '#433022', fillB: '#2a1d15' },
  Silver: { border: '#c4ceda', glow: '#7f8ea0', fillA: '#44556b', fillB: '#1f2937' },
  Gold: { border: '#ffd857', glow: '#f8bf2e', fillA: '#5d4822', fillB: '#251d0f' },
  Diamond: { border: '#73e7ff', glow: '#55bfff', fillA: '#1c4f65', fillB: '#102136' }
} as const;

for (const card of CARD_TEMPLATES) {
  const t = tierTheme[card.tier];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024" role="img" aria-label="${card.name}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.fillA}"/>
      <stop offset="100%" stop-color="${t.fillB}"/>
    </linearGradient>
    <radialGradient id="g" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${t.glow}" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="${t.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="768" height="1024" rx="54" fill="#07101d"/>
  <rect x="24" y="24" width="720" height="976" rx="46" fill="url(#bg)" stroke="${t.border}" stroke-width="12"/>
  <rect x="52" y="145" width="664" height="666" rx="28" fill="#0a1628" stroke="${t.border}" stroke-opacity="0.7"/>
  <circle cx="384" cy="450" r="270" fill="url(#g)"/>
  <text x="384" y="104" fill="${t.border}" font-size="38" font-family="Georgia, serif" text-anchor="middle" letter-spacing="2">${card.tier.toUpperCase()}</text>
  <text x="384" y="872" fill="#f8fafc" font-size="48" font-family="Georgia, serif" text-anchor="middle">${card.name}</text>
  <text x="384" y="935" fill="#9ca3af" font-size="24" font-family="monospace" text-anchor="middle">CashBorders • BCH • POC</text>
</svg>`;

  writeFileSync(path.join(outDir, path.basename(card.image)), svg);
}

console.log(`Generated ${CARD_TEMPLATES.length} card SVG files in ${outDir}`);

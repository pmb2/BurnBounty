// @ts-nocheck
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compileFile } from 'cashscript';

const contracts = ['PackCommit', 'PackReveal', 'PrizePool', 'CardRedeemer'] as const;
const artifactsDir = path.join(process.cwd(), 'artifacts');
mkdirSync(artifactsDir, { recursive: true });

for (const name of contracts) {
  const source = path.join(process.cwd(), 'contracts', `${name}.cash`);
  const artifact = compileFile(source);
  const output = path.join(artifactsDir, `${name}.artifact.json`);
  writeFileSync(output, JSON.stringify(artifact, null, 2));
  console.log(`Compiled ${name} -> ${output}`);
}

console.log('Done.');

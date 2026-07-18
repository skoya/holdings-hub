#!/usr/bin/env node
/**
 * Generate the structured Evidence Register (PLAN Section 27) from the
 * human-readable markdown tables in docs/EVIDENCE.md. Keeps docs/evidence.json
 * a faithful mirror without hand-maintaining two copies. Run after editing
 * docs/EVIDENCE.md: `node scripts/build-evidence-json.mjs`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MD = resolve(HERE, '../docs/EVIDENCE.md');
const OUT = resolve(HERE, '../docs/evidence.json');

const md = await readFile(MD, 'utf8');
const entries = [];

for (const line of md.split('\n')) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  if (cells.length !== 5) continue;
  const [id, claim, source, url, checked] = cells;
  if (!/^\d+$/.test(id)) continue; // skip header + separator rows
  entries.push({ id: Number(id), claim, source, url, checked });
}

entries.sort((a, b) => a.id - b.id);

const register = {
  title: 'Holdings Hub Prototype — Evidence Register',
  note: 'Real-world references supporting simulated concepts (PLAN Section 27). Meridian Bank is fictional; real institutions appear as citations only.',
  count: entries.length,
  entries,
};

await writeFile(OUT, JSON.stringify(register, null, 2) + '\n');
console.log(`evidence.json written: ${entries.length} entries`);

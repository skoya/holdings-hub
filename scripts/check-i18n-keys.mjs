#!/usr/bin/env node
/**
 * CI gate (PLAN Sections 21 / 39.1): assert that every locale bundle has
 * exactly the same set of keys as the English source. Missing or extra keys
 * fail the build. No runtime dependency — pure Node.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(HERE, '../src/i18n/locales');
const LOCALES = ['de', 'fr', 'ja'];

function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out.add(path);
  }
  return out;
}

async function load(name) {
  return JSON.parse(await readFile(resolve(LOCALES_DIR, `${name}.json`), 'utf8'));
}

const en = flatten(await load('en'));
let failed = false;

for (const locale of LOCALES) {
  const keys = flatten(await load(locale));
  const missing = [...en].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !en.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${locale}: ${missing.length} missing, ${extra.length} extra`);
    if (missing.length) console.error(`   missing: ${missing.join(', ')}`);
    if (extra.length) console.error(`   extra:   ${extra.join(', ')}`);
  } else {
    console.log(`✓ ${locale}: ${keys.size} keys match en`);
  }
}

if (failed) {
  console.error('i18n key parity check failed.');
  process.exit(1);
}
console.log('i18n key parity OK.');

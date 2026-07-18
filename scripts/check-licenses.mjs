#!/usr/bin/env node
/**
 * Licence allowlist gate (PLAN Sections 30 / 39.4). Uses pnpm's built-in
 * `pnpm licenses list --json --prod` (no extra dependency, no network) and
 * fails the build if any production dependency ships under a copyleft /
 * network-copyleft licence that is not dual-licensed under a permissive
 * alternative. Unknown licences are reported as warnings, not failures, so the
 * gate is not brittle against unusual-but-permissive SPDX strings.
 */
import { execFileSync } from 'node:child_process';

const ALLOW = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-3.0',
  'Unlicense',
  'Python-2.0',
  'WTFPL',
  'Zlib',
]);

// Licences we will not ship in a distributed static bundle.
const FORBIDDEN = /(^|[^L])GPL|AGPL|LGPL|SSPL|OSL|EUPL|CDDL|CPAL|MPL/i;

function atomsAllowed(expr) {
  // "(MIT OR Apache-2.0)" -> allowed if any OR-alternative is fully permitted.
  const cleaned = expr.replace(/[()]/g, ' ').trim();
  const orAlternatives = cleaned.split(/\s+OR\s+/i);
  return orAlternatives.some((alt) =>
    alt
      .split(/\s+AND\s+/i)
      .map((s) => s.trim())
      .every((tok) => ALLOW.has(tok)),
  );
}

let raw;
try {
  raw = execFileSync('pnpm', ['licenses', 'list', '--json', '--prod'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  // pnpm exits non-zero when it has warnings but still prints JSON on stdout.
  raw = err.stdout?.toString() ?? '';
  if (!raw) {
    console.error('check:licenses: could not run `pnpm licenses list`');
    process.exit(1);
  }
}

const data = JSON.parse(raw);
const forbidden = [];
const unknown = [];

for (const [license, pkgs] of Object.entries(data)) {
  const names = (Array.isArray(pkgs) ? pkgs : []).map((p) => `${p.name}@${p.versions?.join(',') ?? p.version ?? '?'}`);
  if (atomsAllowed(license)) continue;
  if (FORBIDDEN.test(license) && !atomsAllowed(license)) {
    forbidden.push(`${license}: ${names.join(', ')}`);
  } else {
    unknown.push(`${license}: ${names.join(', ')}`);
  }
}

if (unknown.length) {
  console.warn('⚠ licences not on the allowlist (review, not failing):');
  for (const u of unknown) console.warn(`   ${u}`);
}

if (forbidden.length) {
  console.error('✗ forbidden (copyleft) licences in production dependencies:');
  for (const f of forbidden) console.error(`   ${f}`);
  process.exit(1);
}

console.log('✓ licence allowlist clean — no copyleft production dependencies.');

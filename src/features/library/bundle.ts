import type { SimulationSession } from '@/schemas';

/**
 * ZIP bundle export (PLAN Sections 17 / 19). A bundle contains the session
 * JSON, the audit trail as CSV, and a README. The pure builders below are unit
 * tested; the browser wrapper only wires them to JSZip + a download.
 */

function csvCell(value: string): string {
  // RFC-4180 style: wrap in quotes and double internal quotes if needed.
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildAuditCsv(session: SimulationSession): string {
  const header = ['id', 'ts', 'actorPersonaId', 'action', 'objectRef', 'snapshotHash', 'rationale'];
  const rows = session.auditLog.map((e) =>
    [
      e.id,
      e.ts,
      e.actorPersonaId ?? '',
      e.action,
      e.objectRef,
      e.snapshotHash,
      e.rationale ?? '',
    ]
      .map((v) => csvCell(String(v)))
      .join(','),
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}

export function buildBundleReadme(session: SimulationSession): string {
  return [
    'Meridian Bank — Client Holdings Hub simulation bundle',
    '',
    'SIMULATION ONLY — no real transactions or investment advice.',
    '',
    `Session:      ${session.name} (${session.id})`,
    `Schema:       v${session.schemaVersion}`,
    `Seed:         ${session.seed}`,
    `Sim clock:    ${session.clock.currentTs} UTC`,
    `Entities:     ${session.entities.length}`,
    `Holdings:     ${session.holdings.length}`,
    `Transactions: ${session.transactions.length}`,
    `Audit events: ${session.auditLog.length}`,
    '',
    'Contents:',
    '  session.json — full session state (re-importable, Zod-validated)',
    '  audit.csv    — append-only audit trail',
    '  README.txt   — this file',
    '',
    'Same seed + same action script reproduces this session exactly.',
    '',
  ].join('\n');
}

/** File map for the bundle (pure — testable without JSZip). */
export function bundleFiles(session: SimulationSession): Record<string, string> {
  return {
    'session.json': JSON.stringify(session, null, 2) + '\n',
    'audit.csv': buildAuditCsv(session),
    'README.txt': buildBundleReadme(session),
  };
}

export async function buildBundleZip(session: SimulationSession): Promise<Blob> {
  // Dynamic import keeps jszip out of the initial bundle (PLAN Section 31).
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const [name, content] of Object.entries(bundleFiles(session))) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function downloadBundleZip(session: SimulationSession): Promise<void> {
  const blob = await buildBundleZip(session);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `holdings-hub-${session.id}-bundle.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

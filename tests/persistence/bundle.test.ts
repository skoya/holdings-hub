import { describe, expect, it } from 'vitest';
import { buildAuditCsv, bundleFiles, buildBundleReadme } from '@/features/library/bundle';
import { makeSession } from '../fixtures/session';

describe('bundle builders (PLAN Sections 17/19)', () => {
  it('emits an audit CSV with a header and one row per event', () => {
    const session = makeSession();
    const csv = buildAuditCsv(session);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('id,ts,actorPersonaId,action,objectRef,snapshotHash,rationale');
    expect(lines).toHaveLength(1 + session.auditLog.length);
    expect(csv).toContain(session.auditLog[0]!.action);
  });

  it('escapes CSV cells containing commas, quotes or newlines', () => {
    const session = makeSession({
      auditLog: [
        {
          id: 'evt-x',
          ts: '2026-07-17T12:00:00.000Z',
          actorPersonaId: null,
          action: 'policy.block',
          objectRef: 'tx:1',
          snapshotHash: '0',
          rationale: 'blocked, because "limit" breached',
        },
      ],
    });
    const csv = buildAuditCsv(session);
    expect(csv).toContain('"blocked, because ""limit"" breached"');
  });

  it('bundles session json, audit csv and a readme', () => {
    const session = makeSession();
    const files = bundleFiles(session);
    expect(Object.keys(files).sort()).toEqual(['README.txt', 'audit.csv', 'session.json']);
    expect(JSON.parse(files['session.json']!).id).toBe(session.id);
    expect(buildBundleReadme(session)).toContain('SIMULATION ONLY');
    expect(buildBundleReadme(session)).toContain(session.id);
  });
});

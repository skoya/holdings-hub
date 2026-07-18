import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllSessions,
  deleteSession,
  duplicateSession,
  listSessions,
  loadSession,
  renameSession,
  saveSession,
  writeRawEnvelope,
} from '@/persistence/storage';
import { UnsupportedSchemaError } from '@/schemas/migrations';
import { makeSession } from '../fixtures/session';

describe('persistence layer (PLAN Section 24)', () => {
  beforeEach(async () => {
    await clearAllSessions();
  });

  it('save/load round-trips a session exactly', async () => {
    const session = makeSession();
    await saveSession(session);
    const loaded = await loadSession(session.id);
    expect(loaded).toEqual(session);
  });

  it('returns null for a missing session', async () => {
    expect(await loadSession('does-not-exist')).toBeNull();
  });

  it('lists saved sessions with metadata', async () => {
    await saveSession(makeSession());
    await saveSession(makeSession({ id: 'session-2', name: 'Second session' }));
    const list = await listSessions();
    expect(list).toHaveLength(2);
    const names = list.map((s) => s.name).sort();
    expect(names).toEqual(['Fixture: Family Office CIO', 'Second session']);
    expect(list.every((s) => s.schemaVersion === 2)).toBe(true);
    expect(list.every((s) => !Number.isNaN(Date.parse(s.savedAt)))).toBe(true);
  });

  it('deletes a session', async () => {
    const session = makeSession();
    await saveSession(session);
    await deleteSession(session.id);
    expect(await loadSession(session.id)).toBeNull();
    expect(await listSessions()).toHaveLength(0);
  });

  it('rejects saving a session that fails schema validation', async () => {
    const bad = { ...makeSession(), name: '' };
    await expect(saveSession(bad)).rejects.toThrow();
  });

  it('renames a stored session in place (M6)', async () => {
    const session = makeSession();
    await saveSession(session);
    await renameSession(session.id, 'Renamed session');
    const loaded = await loadSession(session.id);
    expect(loaded!.name).toBe('Renamed session');
  });

  it('duplicates a session under a fresh id, replaying identically (M6)', async () => {
    const session = makeSession();
    await saveSession(session);
    const newId = await duplicateSession(session.id);
    expect(newId).not.toBe(session.id);
    const copy = await loadSession(newId);
    expect(copy!.id).toBe(newId);
    expect(copy!.name).toBe(`${session.name} (copy)`);
    // Engine state copied verbatim → identical replay basis.
    expect(copy!.engineState).toEqual(session.engineState);
    expect(await listSessions()).toHaveLength(2);
  });

  it('migrates an older envelope on load (v0 -> v1 -> v2 chain)', async () => {
    const session = makeSession({ id: 'legacy-1' });
    // Strip the v2-only fields to simulate a genuinely old payload.
    const {
      clock: _clock,
      activePersonaId: _ap,
      ...legacyPayload
    } = {
      ...session,
      schemaVersion: 0,
    };
    await writeRawEnvelope('legacy-1', {
      schemaVersion: 0,
      savedAt: '2026-01-01T00:00:00.000Z',
      payload: legacyPayload,
    });
    const loaded = await loadSession('legacy-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(2);
    expect(loaded!.clock.currentTs).toBe('2026-01-05T09:00:00.000Z');
    expect(loaded!.name).toBe(session.name);
  });

  it('rejects envelopes from a newer schema with a clear error', async () => {
    await writeRawEnvelope('future-1', {
      schemaVersion: 999,
      savedAt: '2026-01-01T00:00:00.000Z',
      payload: {},
    });
    await expect(loadSession('future-1')).rejects.toThrow(UnsupportedSchemaError);
  });
});

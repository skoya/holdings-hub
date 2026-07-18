import { describe, expect, it } from 'vitest';
import { SimulationSessionSchema, SCHEMA_VERSION } from '@/schemas';
import { runMigrations, UnsupportedSchemaError } from '@/schemas/migrations';
import { makeSession } from '../fixtures/session';

describe('schema migrations (PLAN Section 24)', () => {
  it('runs the v0 -> v1 -> v2 chain', () => {
    const migrated = runMigrations(0, { schemaVersion: 0 }) as { schemaVersion: number };
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('upgrades a v1 payload by adding the v2 fields', () => {
    const v1 = { schemaVersion: 1, name: 'legacy' };
    const migrated = runMigrations(1, v1) as Record<string, unknown>;
    expect(migrated['schemaVersion']).toBe(2);
    expect(migrated['clock']).toBeDefined();
    expect(migrated).toHaveProperty('activePersonaId', null);
    expect(migrated['transactions']).toEqual([]);
  });

  it('loads and validates a stored v1 session through the runner', () => {
    // A full v2 session downgraded to a v1 shape (drop the sim clock the
    // v1->v2 migration re-adds), fed through the runner, must validate.
    const base = makeSession();
    const { clock: _clock, ...v1Payload } = base;
    const migrated = runMigrations(1, v1Payload);
    const session = SimulationSessionSchema.parse(migrated);
    expect(session.schemaVersion).toBe(SCHEMA_VERSION);
    expect(session.clock.currentTs).toBeDefined();
  });

  it('rejects a session from a future schema version', () => {
    expect(() => runMigrations(SCHEMA_VERSION + 1, {})).toThrow(UnsupportedSchemaError);
  });
});

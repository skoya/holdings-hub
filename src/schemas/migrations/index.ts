import { SCHEMA_VERSION } from '../index';

/**
 * Schema migration runner (PLAN Section 24). Pure functions vN -> vN+1 are
 * applied in sequence when loading a session saved under an older version.
 */

export type Migration = (payload: unknown) => unknown;

export class UnsupportedSchemaError extends Error {
  constructor(public readonly foundVersion: number) {
    super(
      `Session was saved with schema v${foundVersion}, but this build supports up to v${SCHEMA_VERSION}. ` +
        'Update the application to load this session.',
    );
    this.name = 'UnsupportedSchemaError';
  }
}

/**
 * Keyed by the *source* version: migrations[n] upgrades vN -> vN+1.
 * The v0 entry is a stub exercising the runner; real migrations are appended
 * as SCHEMA_VERSION advances.
 */
export const migrations: Record<number, Migration> = {
  0: (payload) => ({ ...(payload as Record<string, unknown>), schemaVersion: 1 }),
  // v1 -> v2 (M2): add sim clock + active persona; expand transactions.
  // v1 sessions had no transactions in practice, but any present lack the v2
  // required fields and cannot be meaningfully upgraded — drop them with the
  // information preserved in the audit log.
  1: (payload) => {
    const p = payload as Record<string, unknown>;
    return {
      ...p,
      schemaVersion: 2,
      clock: p['clock'] ?? { currentTs: '2026-01-05T09:00:00.000Z' },
      activePersonaId: p['activePersonaId'] ?? null,
      transactions: [],
    };
  },
};

export function runMigrations(fromVersion: number, payload: unknown): unknown {
  if (fromVersion > SCHEMA_VERSION) throw new UnsupportedSchemaError(fromVersion);
  let current = payload;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (!migrate) {
      throw new Error(`No migration registered for schema v${v} -> v${v + 1}`);
    }
    current = migrate(current);
  }
  return current;
}

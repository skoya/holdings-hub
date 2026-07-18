import { describe, expect, it } from 'vitest';
import {
  AuditEventSchema,
  EntitySchema,
  HoldingSchema,
  PersonaSchema,
  SCHEMA_VERSION,
  SimulationSessionSchema,
} from '@/schemas';
import { makeSession } from '../fixtures/session';

describe('core Zod schemas (PLAN Section 37)', () => {
  it('accepts a well-formed SimulationSession', () => {
    const session = makeSession();
    const parsed = SimulationSessionSchema.parse(session);
    expect(parsed.id).toBe(session.id);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('applies defaults for optional collections and settings', () => {
    const session = makeSession();
    const parsed = SimulationSessionSchema.parse({
      ...session,
      transactions: undefined,
      auditLog: undefined,
      settings: undefined,
      pinnedPositions: undefined,
    });
    expect(parsed.transactions).toEqual([]);
    expect(parsed.auditLog).toEqual([]);
    expect(parsed.settings).toEqual({ locale: 'en', defiEnabled: false, livePrices: false });
    expect(parsed.pinnedPositions).toEqual({});
  });

  it('rejects a wrong schemaVersion', () => {
    const session = { ...makeSession(), schemaVersion: 999 };
    expect(() => SimulationSessionSchema.parse(session)).toThrow();
  });

  it('rejects entities with non-fictional LEI formats', () => {
    const entity = {
      id: 'ent-1',
      name: 'Test',
      type: 'single-family-office',
      jurisdiction: 'GB',
      lei: '529900T8BM49AURSDO55', // real-looking LEI must be rejected (Section 29)
      parentId: null,
      relationships: [],
    };
    expect(() => EntitySchema.parse(entity)).toThrow();
    expect(EntitySchema.parse({ ...entity, lei: 'SIM-ABCD1234EFGH5678' }).lei).toMatch(/^SIM-/);
  });

  it('rejects holdings with invalid valuation timestamps', () => {
    const session = makeSession();
    const holding = {
      ...session.holdings[0]!,
      valuation: { ...session.holdings[0]!.valuation, asOf: 'yesterday' },
    };
    expect(() => HoldingSchema.parse(holding)).toThrow();
  });

  it('rejects personas with unknown entitlement levels', () => {
    const session = makeSession();
    const persona = {
      ...session.personas[0]!,
      grants: [{ relationship: 'custody', assetClass: 'cash', level: 'superuser' }],
    };
    expect(() => PersonaSchema.parse(persona)).toThrow();
  });

  it('requires UTC ISO timestamps on audit events', () => {
    const good = {
      id: 'evt-1',
      ts: '2026-07-18T00:00:00.000Z',
      actorPersonaId: null,
      action: 'session.created',
      objectRef: 'session:s-1',
      snapshotHash: 'abc123',
    };
    expect(AuditEventSchema.parse(good).ts).toBe(good.ts);
    expect(() => AuditEventSchema.parse({ ...good, ts: '18/07/2026' })).toThrow();
  });

  it('round-trips a session through JSON without loss', () => {
    const parsed = SimulationSessionSchema.parse(makeSession());
    const roundTripped = SimulationSessionSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
  });
});

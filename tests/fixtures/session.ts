import { createEngine } from '@/engine/prng';
import { SCHEMA_VERSION, type SimulationSession } from '@/schemas';

/** Canonical valid session fixture used across schema/persistence tests. */
export function makeSession(overrides: Partial<SimulationSession> = {}): SimulationSession {
  const engine = createEngine(1234);
  engine.fork('market').next();

  return {
    id: 'session-fixture-1',
    name: 'Fixture: Family Office CIO',
    schemaVersion: SCHEMA_VERSION,
    seed: 1234,
    engineState: engine.serialize(),
    entities: [
      {
        id: 'ent-1',
        name: 'Aldergate Family Office',
        type: 'single-family-office',
        jurisdiction: 'GB',
        lei: 'SIM-ALDG1234FAMO5678',
        parentId: null,
        relationships: ['custody', 'payments', 'wallet-services'],
      },
    ],
    personas: [
      {
        id: 'per-1',
        entityId: 'ent-1',
        role: 'cio',
        displayName: 'Investment Director',
        grants: [
          { relationship: 'custody', assetClass: 'cash', level: 'view' },
          { relationship: 'payments', assetClass: 'cash', level: 'initiate' },
          { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'initiate' },
        ],
        limits: { perTransaction: 1_000_000, daily: 5_000_000, currency: 'GBP' },
      },
    ],
    holdings: [
      {
        id: 'hld-1',
        assetRef: 'asset-gbp-cash',
        quantity: 2_500_000,
        valuation: {
          value: 2_500_000,
          currency: 'GBP',
          asOf: '2026-07-17T12:00:00.000Z',
          mode: 'deterministic',
        },
        custodyLocation: 'meridian',
        encumbrance: 'free',
        authoritativeSource: 'meridian',
      },
      {
        id: 'hld-2',
        assetRef: 'asset-usdc',
        quantity: 150_000,
        valuation: {
          value: 118_000,
          currency: 'GBP',
          asOf: '2026-07-17T12:00:00.000Z',
          mode: 'deterministic',
        },
        custodyLocation: 'on-chain',
        network: 'sim-evm',
        encumbrance: 'free',
        authoritativeSource: 'external',
      },
    ],
    transactions: [],
    auditLog: [
      {
        id: 'evt-1',
        ts: '2026-07-17T12:00:00.000Z',
        actorPersonaId: null,
        action: 'session.created',
        objectRef: 'session:session-fixture-1',
        snapshotHash: '00000000',
      },
    ],
    settings: { locale: 'en', defiEnabled: false, livePrices: false },
    pinnedPositions: {},
    ...overrides,
  };
}

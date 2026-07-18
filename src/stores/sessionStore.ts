import { create } from 'zustand';
import { Engine, createEngine } from '@/engine/prng';
import { hashObject } from '@/engine/hash';
import { nextId, nextReference } from '@/engine/ids';
import { addMinutes } from '@/engine/calendar';
import { assertTransition, latencyMinutes } from '@/engine/lifecycle';
import { buildRouteComparison } from '@/engine/routing';
import { runScreening } from '@/engine/screening';
import { buildTravelRulePacket } from '@/engine/travelRule';
import { convert } from '@/engine/fx';
import {
  ASSETS,
  CIO_GRANTS,
  CIO_LIMITS,
  FAMILY_OFFICE_TEMPLATE,
  SLICE_PORTFOLIO,
  assetById,
} from '@/config/catalog';
import { saveSession } from '@/persistence/storage';
import {
  SIM_EPOCH,
  SCHEMA_VERSION,
  SimulationSessionSchema,
  type Jurisdiction,
  type Party,
  type SimulationSession,
  type Transaction,
  type TransactionState,
} from '@/schemas';

/**
 * Session store (PLAN Section 36): Zustand wraps engine state; actions are the
 * only mutation path and every mutating action emits an AuditEvent (Section
 * 17). The store snapshot serialises directly to the session JSON payload.
 */

export interface WizardInput {
  sessionName: string;
  entityName: string;
  jurisdiction: Jurisdiction;
  relationships: SimulationSession['entities'][number]['relationships'];
  personaDisplayName: string;
  seed: number;
}

export interface PaymentInput {
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryInstitution: string;
  beneficiaryJurisdiction: Jurisdiction;
  rationale?: string;
}

export interface UsdcTransferInput {
  amount: number;
  beneficiaryName: string;
  beneficiaryInstitution: string;
  beneficiaryJurisdiction: Jurisdiction;
  rationale?: string;
}

interface SessionStore {
  session: SimulationSession | null;
  engine: Engine | null;
  lastError: string | null;
  createSliceSession: (input: WizardInput) => string;
  adoptSession: (session: SimulationSession) => void;
  clearSession: () => void;
  exportSessionJson: () => string;
  createPayment: (input: PaymentInput) => string;
  createUsdcTransfer: (input: UsdcTransferInput) => string;
  validateTransaction: (txId: string) => void;
  approveTransaction: (txId: string) => void;
  selectRoute: (txId: string, routeId: string) => void;
  runSettlement: (txId: string) => void;
}

/** Hash of session state excluding the audit log itself (before/after snapshots). */
function snapshotHash(session: SimulationSession): string {
  const { auditLog: _auditLog, ...rest } = session;
  return hashObject(rest);
}

function withAudit(
  session: SimulationSession,
  engine: Engine,
  action: string,
  objectRef: string,
  rationale?: string,
): SimulationSession {
  const event = {
    id: nextId(engine, 'evt'),
    ts: session.clock.currentTs,
    actorPersonaId: session.activePersonaId,
    action,
    objectRef,
    snapshotHash: snapshotHash(session),
    ...(rationale ? { rationale } : {}),
  };
  return { ...session, engineState: engine.serialize(), auditLog: [...session.auditLog, event] };
}

function tickClock(session: SimulationSession, engine: Engine, to: TransactionState): string {
  const minutes = latencyMinutes(engine.fork('latency'), to);
  return addMinutes(session.clock.currentTs, minutes);
}

function updateTx(
  session: SimulationSession,
  txId: string,
  update: (tx: Transaction) => Transaction,
): SimulationSession {
  return {
    ...session,
    transactions: session.transactions.map((t) => (t.id === txId ? update(t) : t)),
  };
}

function getTx(session: SimulationSession, txId: string): Transaction {
  const tx = session.transactions.find((t) => t.id === txId);
  if (!tx) throw new Error(`Unknown transaction ${txId}`);
  return tx;
}

function transition(
  session: SimulationSession,
  engine: Engine,
  txId: string,
  to: TransactionState,
  note?: string,
): SimulationSession {
  const tx = getTx(session, txId);
  assertTransition(tx.state, to);
  const ts = tickClock(session, engine, to);
  const next = updateTx({ ...session, clock: { currentTs: ts } }, txId, (t) => ({
    ...t,
    state: to,
    updatedAt: ts,
    events: [...t.events, { state: to, ts, ...(note ? { note } : {}) }],
  }));
  return withAudit(next, engine, `transaction.${to}`, `tx:${txId}`, note);
}

function persist(session: SimulationSession): void {
  // Fire-and-forget; storage errors surface via console + the library view.
  void saveSession(session).catch((err) => console.error('saveSession failed', err));
}

const MERIDIAN_ACCOUNT = 'SIM:GB00MERI00000001';

function originatorParty(session: SimulationSession): Party {
  const entity = session.entities[0];
  return {
    name: entity ? entity.name : 'Unknown entity',
    account: MERIDIAN_ACCOUNT,
    jurisdiction: entity ? entity.jurisdiction : 'GB',
    institution: 'Meridian Bank (fictional)',
  };
}

export const useSessionStore = create<SessionStore>((set, get) => {
  /** Run a mutation against the current session+engine, persist, and set. */
  function mutate(fn: (session: SimulationSession, engine: Engine) => SimulationSession): void {
    const { session, engine } = get();
    if (!session || !engine) throw new Error('No active session');
    try {
      const next = fn(session, engine);
      persist(next);
      set({ session: next, lastError: null });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  return {
    session: null,
    engine: null,
    lastError: null,

    createSliceSession: (input) => {
      const engine = createEngine(input.seed);
      const entityId = nextId(engine, 'ent');
      const personaId = nextId(engine, 'per');
      const leiStream = engine.fork('ids');
      const lei = `SIM-${Array.from({ length: 16 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(leiStream.nextInt(0, 35)),
      ).join('')}`;

      const market = engine.fork('market');
      const holdings = SLICE_PORTFOLIO.map(([assetRef, quantity, custody, source]) => {
        const asset = assetById(assetRef);
        const valueInGbp =
          asset.currency === 'GBP' ? quantity : convert(market, quantity, asset.currency, 'GBP');
        return {
          id: nextId(engine, 'hld'),
          assetRef,
          quantity,
          valuation: {
            value: Math.round(valueInGbp * 100) / 100,
            currency: 'GBP',
            asOf: SIM_EPOCH,
            mode: 'deterministic' as const,
          },
          custodyLocation: custody,
          ...(asset.network ? { network: asset.network } : {}),
          encumbrance: 'free' as const,
          authoritativeSource: source,
        };
      });

      let session: SimulationSession = SimulationSessionSchema.parse({
        id: nextId(engine, 'session'),
        name: input.sessionName,
        schemaVersion: SCHEMA_VERSION,
        seed: input.seed,
        engineState: engine.serialize(),
        clock: { currentTs: SIM_EPOCH },
        entities: [
          {
            id: entityId,
            name: input.entityName,
            type: FAMILY_OFFICE_TEMPLATE.type,
            jurisdiction: input.jurisdiction,
            lei,
            parentId: null,
            relationships: [...input.relationships],
          },
        ],
        personas: [
          {
            id: personaId,
            entityId,
            role: 'cio',
            displayName: input.personaDisplayName,
            grants: CIO_GRANTS,
            limits: CIO_LIMITS,
          },
        ],
        activePersonaId: personaId,
        holdings,
        transactions: [],
        auditLog: [],
      });
      session = withAudit(session, engine, 'session.created', `session:${session.id}`);
      persist(session);
      set({ session, engine, lastError: null });
      return session.id;
    },

    adoptSession: (raw) => {
      const session = SimulationSessionSchema.parse(raw);
      const engine = Engine.restore(session.engineState);
      set({ session, engine, lastError: null });
    },

    clearSession: () => set({ session: null, engine: null, lastError: null }),

    exportSessionJson: () => {
      const { session, engine } = get();
      if (!session || !engine) throw new Error('No active session');
      return JSON.stringify({ ...session, engineState: engine.serialize() }, null, 2);
    },

    createPayment: (input) => {
      let txId = '';
      mutate((session, engine) => {
        const persona = session.personas.find((p) => p.id === session.activePersonaId);
        const originator = originatorParty(session);
        txId = nextId(engine, 'tx');
        const ts = session.clock.currentTs;
        const beneficiary: Party = {
          name: input.beneficiaryName,
          account: 'SIM:CH00EXTB00000002',
          jurisdiction: input.beneficiaryJurisdiction,
          institution: input.beneficiaryInstitution,
        };
        const overLimit = persona?.limits && input.amount > persona.limits.perTransaction;
        const tx: Transaction = {
          id: txId,
          type: 'cross-border-payment',
          state: 'draft',
          amount: input.amount,
          currency: input.currency,
          assetRef: 'asset-gbp-cash',
          originator,
          beneficiary,
          createdAt: ts,
          updatedAt: ts,
          events: [{ state: 'draft', ts }],
          route: buildRouteComparison({
            routingStream: engine.fork('routing'),
            type: 'cross-border-payment',
            nowTs: ts,
            destJurisdiction: input.beneficiaryJurisdiction,
            crossCurrency: true,
          }),
          reference: nextReference(engine),
          metadata: {
            ...(overLimit ? { limitWarning: 'Amount exceeds per-transaction limit' } : {}),
            targetCurrency: 'CHF',
          },
        };
        const next = { ...session, transactions: [...session.transactions, tx] };
        return withAudit(next, engine, 'transaction.draft', `tx:${txId}`, input.rationale);
      });
      return txId;
    },

    createUsdcTransfer: (input) => {
      let txId = '';
      mutate((session, engine) => {
        const originator = originatorParty(session);
        txId = nextId(engine, 'tx');
        const ts = session.clock.currentTs;
        const beneficiary: Party = {
          name: input.beneficiaryName,
          account: 'SIM:0xSIMULATEDWALLET0003',
          jurisdiction: input.beneficiaryJurisdiction,
          institution: input.beneficiaryInstitution,
        };
        const tx: Transaction = {
          id: txId,
          type: 'stablecoin-transfer',
          state: 'draft',
          amount: input.amount,
          currency: 'USD',
          assetRef: 'asset-usdc',
          originator,
          beneficiary,
          createdAt: ts,
          updatedAt: ts,
          events: [{ state: 'draft', ts }],
          route: buildRouteComparison({
            routingStream: engine.fork('routing'),
            type: 'stablecoin-transfer',
            nowTs: ts,
            destJurisdiction: input.beneficiaryJurisdiction,
            crossCurrency: false,
          }),
          travelRule: buildTravelRulePacket({
            originator,
            beneficiary,
            amount: input.amount,
            amountUsdEquivalent: input.amount,
            assetSymbol: 'USDC',
            ts,
          }),
          reference: nextReference(engine),
          metadata: {},
        };
        const next = { ...session, transactions: [...session.transactions, tx] };
        return withAudit(next, engine, 'transaction.draft', `tx:${txId}`, input.rationale);
      });
      return txId;
    },

    validateTransaction: (txId) => {
      mutate((session, engine) => {
        const tx = getTx(session, txId);
        const persona = session.personas.find((p) => p.id === session.activePersonaId);
        if (persona?.limits && tx.amount > persona.limits.perTransaction) {
          return transition(session, engine, txId, 'failed', 'Per-transaction limit breached');
        }
        let s = transition(session, engine, txId, 'validated');
        const screening = runScreening(tx.beneficiary, s.clock.currentTs);
        s = updateTx(s, txId, (t) => ({ ...t, screening }));
        s = withAudit(s, engine, `screening.${screening.outcome}`, `tx:${txId}`, screening.note);
        if (screening.outcome === 'blocked') {
          return transition(s, engine, txId, 'failed', 'Screening blocked (simulation)');
        }
        return transition(s, engine, txId, 'pending-approval');
      });
    },

    approveTransaction: (txId) => {
      mutate((session, engine) =>
        transition(
          session,
          engine,
          txId,
          'approved',
          'Single-approver flow (four-eyes thresholds arrive in M4)',
        ),
      );
    },

    selectRoute: (txId, routeId) => {
      mutate((session, engine) => {
        const tx = getTx(session, txId);
        const option = tx.route?.options.find((o) => o.id === routeId);
        if (!option) throw new Error(`Unknown route ${routeId}`);
        let s = updateTx(session, txId, (t) => ({
          ...t,
          route: t.route ? { ...t.route, selectedRouteId: routeId } : t.route,
        }));
        s = withAudit(
          s,
          engine,
          'route.selected',
          `tx:${txId}`,
          `${option.label} — ${option.etaMinutes} min ETA, ${option.costBps} bps + ${option.feeFlat} flat; comparison snapshot retained`,
        );
        return transition(s, engine, txId, 'routing');
      });
    },

    runSettlement: (txId) => {
      mutate((session, engine) => {
        let s = transition(session, engine, txId, 'in-flight');
        const tx = getTx(s, txId);
        // Settlement effects: debit the funding holding (amount + flat fee).
        const route = tx.route?.options.find((o) => o.id === tx.route?.selectedRouteId);
        const fee = route ? route.feeFlat + (tx.amount * route.costBps) / 10_000 : 0;
        s = {
          ...s,
          holdings: s.holdings.map((h) =>
            h.assetRef === tx.assetRef
              ? { ...h, quantity: Math.round((h.quantity - tx.amount - fee) * 100) / 100 }
              : h,
          ),
        };
        s = withAudit(
          s,
          engine,
          'holdings.debited',
          `holding:${tx.assetRef}`,
          `Debit ${tx.amount} ${tx.currency} + ${fee.toFixed(2)} fees (simulated)`,
        );
        return transition(s, engine, txId, 'settled', route ? `Settled via ${route.label}` : undefined);
      });
    },
  };
});

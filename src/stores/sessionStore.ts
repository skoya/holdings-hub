import { create } from 'zustand';
import { Engine, createEngine } from '@/engine/prng';
import { hashObject } from '@/engine/hash';
import { nextId, nextReference } from '@/engine/ids';
import { addMinutes } from '@/engine/calendar';
import { assertTransition, latencyMinutes } from '@/engine/lifecycle';
import { buildRouteComparison } from '@/engine/routing';
import { fxRate } from '@/engine/fx';
import { runScreening } from '@/engine/screening';
import { fetchLivePrices } from '@/engine/marketData';
import { evaluateTransaction, hasBlockingDecision, relationshipForType } from '@/engine/policy';
import { buildTravelRulePacket } from '@/engine/travelRule';
import { convert } from '@/engine/fx';
import { assetById, personaTemplate, scenarioPreset } from '@/config/catalog';
import { saveSession } from '@/persistence/storage';
import {
  SIM_EPOCH,
  SCHEMA_VERSION,
  SimulationSessionSchema,
  type Jurisdiction,
  type Party,
  type PersonaRole,
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
  presetId: string;
  sessionName: string;
  entityName: string;
  jurisdiction: Jurisdiction;
  relationships: SimulationSession['entities'][number]['relationships'];
  personaDisplayName: string;
  seed: number;
  /** Opt-in DeFi module (PLAN Section 13). Off by default. */
  defiEnabled?: boolean;
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
  /** Transient live reference prices (symbol → USD). Never persisted; the
   * session only records which mode is active (settings.livePrices). */
  livePrices: Record<string, number> | null;
  setLivePrices: (enabled: boolean) => Promise<void>;
  createSliceSession: (input: WizardInput) => string;
  createDsvpDemo: () => string;
  adoptSession: (session: SimulationSession) => void;
  clearSession: () => void;
  exportSessionJson: () => string;
  createPayment: (input: PaymentInput) => string;
  createUsdcTransfer: (input: UsdcTransferInput) => string;
  validateTransaction: (txId: string) => void;
  approveTransaction: (txId: string) => void;
  switchPersona: (personaId: string) => void;
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

const OPERATIONAL_PERSONA_ROLES: PersonaRole[] = [
  'treasurer',
  'compliance-officer',
  'operations-manager',
  'external-auditor',
];

/** Backfill role journeys into sessions saved before the persona workbench. */
function enrichPersonaRoster(session: SimulationSession, engine: Engine): SimulationSession {
  const entityId = session.entities[0]?.id;
  if (!entityId) return session;
  const existing = new Set(session.personas.map((persona) => persona.role));
  const missing = OPERATIONAL_PERSONA_ROLES.filter((role) => !existing.has(role));
  if (missing.length === 0) return session;

  const personas = missing.map((role) => {
    const template = personaTemplate(role);
    return {
      id: nextId(engine, 'per'),
      entityId,
      role,
      displayName: template.defaultDisplayName,
      grants: template.grants,
      ...(template.limits ? { limits: template.limits } : {}),
    };
  });
  return withAudit(
    { ...session, personas: [...session.personas, ...personas] },
    engine,
    'session.personas-upgraded',
    `session:${session.id}`,
    `Added role journeys: ${missing.join(', ')}`,
  );
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
    livePrices: null,

    setLivePrices: async (enabled) => {
      if (!enabled) {
        set({ livePrices: null });
        mutate((session, engine) =>
          withAudit(
            { ...session, settings: { ...session.settings, livePrices: false } },
            engine,
            'settings.live-prices-off',
            `session:${session.id}`,
          ),
        );
        return;
      }
      const { session } = get();
      if (!session) throw new Error('No active session');
      const symbols = [
        ...new Set(
          session.holdings
            .map((h) => assetById(h.assetRef))
            .filter((a) => a.class === 'crypto' || a.class === 'stablecoin')
            .map((a) => a.symbol),
        ),
      ];
      try {
        const result = await fetchLivePrices(symbols, session.clock.currentTs);
        set({ livePrices: result.prices, lastError: null });
        mutate((s, engine) =>
          withAudit(
            { ...s, settings: { ...s.settings, livePrices: true } },
            engine,
            'settings.live-prices-on',
            `session:${s.id}`,
            `Live reference prices from CoinGecko (${Object.keys(result.prices).join(', ')})`,
          ),
        );
      } catch {
        // Deterministic fallback (Section 25) — never a hard failure. Record
        // the mode first (mutate clears lastError on success), then surface the
        // fallback message so the UI can explain it.
        mutate((s, engine) =>
          withAudit(
            { ...s, settings: { ...s.settings, livePrices: false } },
            engine,
            'settings.live-prices-fallback',
            `session:${s.id}`,
            'CoinGecko unavailable; deterministic fallback',
          ),
        );
        set({
          livePrices: null,
          lastError: 'Live prices unavailable — using deterministic values.',
        });
      }
    },

    createSliceSession: (input) => {
      const preset = scenarioPreset(input.presetId);
      const persona = personaTemplate(preset.personaRole);
      const engine = createEngine(input.seed);
      const entityId = nextId(engine, 'ent');
      const personaId = nextId(engine, 'per');
      const leiStream = engine.fork('ids');
      const lei = `SIM-${Array.from({ length: 16 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(leiStream.nextInt(0, 35)),
      ).join('')}`;

      const market = engine.fork('market');
      const holdings = preset.portfolio.map(([assetRef, quantity, custody, source]) => {
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

      // DeFi opt-in module (Section 13): simulated positions sit OUTSIDE the
      // Meridian custody perimeter. Only materialised when the wizard opt-in is
      // on, so default sessions are unchanged (holdings === portfolio length).
      const defiHoldings = input.defiEnabled
        ? (
            [
              ['asset-staked-eth', 340_000],
              ['asset-lp-share', 180_000],
            ] as const
          ).map(([assetRef, quantity]) => {
            const asset = assetById(assetRef);
            const valueInGbp = convert(market, quantity, asset.currency, 'GBP');
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
              custodyLocation: 'on-chain' as const,
              ...(asset.network ? { network: asset.network } : {}),
              encumbrance: 'free' as const,
              authoritativeSource: 'external' as const,
            };
          })
        : [];

      // DeFi visibility is entitlement-gated: grant the primary persona a defi
      // view entitlement only when opted in. The control signatory is left
      // without it, so switching personas demonstrates the gate.
      const primaryGrants = input.defiEnabled
        ? [
            ...persona.grants,
            {
              relationship: 'wallet-services' as const,
              assetClass: 'defi' as const,
              level: 'view' as const,
            },
          ]
        : persona.grants;

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
            type: preset.entityType,
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
            role: preset.personaRole,
            displayName: input.personaDisplayName,
            grants: primaryGrants,
            ...(persona.limits ? { limits: persona.limits } : {}),
          },
          {
            id: nextId(engine, 'per'),
            entityId,
            role: 'authorised-signatory',
            displayName: 'Meridian Control Signatory',
            grants: [
              { relationship: 'payments', assetClass: 'cash', level: 'approve' },
              { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'approve' },
              { relationship: 'tokenisation-agent', assetClass: 'tokenised', level: 'approve' },
            ],
            limits: { perTransaction: 10_000_000, daily: 25_000_000, currency: 'GBP' },
          },
          ...(
            ['treasurer', 'compliance-officer', 'operations-manager', 'external-auditor'] as const
          )
            .filter((role) => role !== preset.personaRole)
            .map((role) => {
              const support = personaTemplate(role);
              return {
                id: nextId(engine, 'per'),
                entityId,
                role,
                displayName: support.defaultDisplayName,
                grants: support.grants,
                ...(support.limits ? { limits: support.limits } : {}),
              };
            }),
        ],
        activePersonaId: personaId,
        settings: { defiEnabled: input.defiEnabled ?? false },
        holdings: [...holdings, ...defiHoldings],
        transactions: [],
        auditLog: [],
      });
      session = withAudit(session, engine, 'session.created', `session:${session.id}`);
      persist(session);
      set({ session, engine, lastError: null });
      return session.id;
    },

    adoptSession: (raw) => {
      const parsed = SimulationSessionSchema.parse(raw);
      const engine = Engine.restore(parsed.engineState);
      const session = enrichPersonaRoster(parsed, engine);
      if (session !== parsed) persist(session);
      set({ session, engine, lastError: null });
    },

    clearSession: () => set({ session: null, engine: null, lastError: null }),

    switchPersona: (personaId) => {
      mutate((session, engine) => {
        if (!session.personas.some((persona) => persona.id === personaId)) {
          throw new Error(`Unknown persona ${personaId}`);
        }
        return withAudit(
          { ...session, activePersonaId: personaId },
          engine,
          'persona.activated',
          `persona:${personaId}`,
        );
      });
    },

    exportSessionJson: () => {
      const { session, engine } = get();
      if (!session || !engine) throw new Error('No active session');
      // Canonicalise through the schema so export -> import -> export is
      // byte-identical (Zod rebuilds objects in schema key order).
      const canonical = SimulationSessionSchema.parse({
        ...session,
        engineState: engine.serialize(),
      });
      return JSON.stringify(canonical, null, 2);
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
          policyDecisions: [],
          route: buildRouteComparison({
            routingStream: engine.fork('routing'),
            type: 'cross-border-payment',
            nowTs: ts,
            destJurisdiction: input.beneficiaryJurisdiction,
            crossCurrency: true,
          }),
          reference: nextReference(engine),
          initiatedByPersonaId: session.activePersonaId ?? undefined,
          metadata: {
            ...(overLimit ? { limitWarning: 'Amount exceeds per-transaction limit' } : {}),
            targetCurrency: 'CHF',
            // Indicative GBP→CHF rate captured once at creation from a dedicated
            // `fx` stream so it never perturbs other namespaced streams (Section
            // 23) and replays identically. Indicative only — not a quoted rate.
            indicativeFxRate: String(fxRate(engine.fork('fx'), 'GBP', 'CHF')),
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
          policyDecisions: [],
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
          initiatedByPersonaId: session.activePersonaId ?? undefined,
          metadata: {},
        };
        const next = { ...session, transactions: [...session.transactions, tx] };
        return withAudit(next, engine, 'transaction.draft', `tx:${txId}`, input.rationale);
      });
      return txId;
    },

    createDsvpDemo: () => {
      let txId = '';
      mutate((session, engine) => {
        const hasLegs =
          session.holdings.some((h) => h.assetRef === 'asset-tokenised-bond') &&
          session.holdings.some((h) => h.assetRef === 'asset-tokenised-deposit');
        if (!hasLegs) {
          throw new Error(
            'DvP demo needs tokenised bond and tokenised deposit holdings (asset-manager preset)',
          );
        }
        const originator = originatorParty(session);
        txId = nextId(engine, 'tx');
        const ts = session.clock.currentTs;
        const beneficiary: Party = {
          name: 'Kestrel Securities LLC (counterparty)',
          account: 'SIM:US00KSTL00000004',
          jurisdiction: 'US',
          institution: 'Kestrel Securities LLC (fictional)',
        };
        const tx: Transaction = {
          id: txId,
          type: 'dsvp-settlement',
          state: 'draft',
          amount: 1_000_000,
          currency: 'USD',
          assetRef: 'asset-tokenised-bond',
          originator,
          beneficiary,
          createdAt: ts,
          updatedAt: ts,
          events: [{ state: 'draft', ts }],
          policyDecisions: [],
          route: buildRouteComparison({
            routingStream: engine.fork('routing'),
            type: 'dsvp-settlement',
            nowTs: ts,
            destJurisdiction: 'US',
            crossCurrency: false,
          }),
          reference: nextReference(engine),
          initiatedByPersonaId: session.activePersonaId ?? undefined,
          metadata: {
            deliveryLeg: 'asset-tokenised-bond +1,000,000 USD face (from counterparty)',
            paymentLeg: 'asset-tokenised-deposit -1,000,000 USD (to counterparty)',
            settlementModel: 'atomic delivery-versus-payment on simulated permissioned ledger',
          },
        };
        const next = { ...session, transactions: [...session.transactions, tx] };
        return withAudit(
          next,
          engine,
          'transaction.draft',
          `tx:${txId}`,
          'DvP demo: tokenised bond purchase settled against tokenised cash',
        );
      });
      return txId;
    },

    validateTransaction: (txId) => {
      mutate((session, engine) => {
        const tx = getTx(session, txId);
        const persona = session.personas.find((p) => p.id === session.activePersonaId);
        if (!persona) throw new Error('Active persona not found');
        const policyDecisions = evaluateTransaction(session, tx, persona);
        let policySession = updateTx(session, txId, (item) => ({ ...item, policyDecisions }));
        for (const decision of policyDecisions) {
          policySession = withAudit(
            policySession,
            engine,
            `policy.${decision.outcome}`,
            `tx:${txId}`,
            `${decision.ruleId}: ${decision.explanation}`,
          );
        }
        if (hasBlockingDecision(policyDecisions)) {
          return transition(policySession, engine, txId, 'failed', 'Blocked by policy decision');
        }
        let s = transition(policySession, engine, txId, 'validated');
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
      mutate((session, engine) => {
        const tx = getTx(session, txId);
        const actor = session.personas.find((persona) => persona.id === session.activePersonaId);
        if (!actor) throw new Error('Active persona not found');
        const requiresFourEyes = tx.policyDecisions.some(
          (decision) => decision.ruleId === 'APP-001' && decision.outcome === 'require-approval',
        );
        if (requiresFourEyes && tx.initiatedByPersonaId === actor.id) {
          throw new Error('Four-eyes control: the initiator cannot approve this transaction');
        }
        const relationship = relationshipForType(tx.type);
        const canApprove = actor.grants.some(
          (grant) =>
            grant.relationship === relationship && ['approve', 'admin'].includes(grant.level),
        );
        if (!canApprove) throw new Error(`${actor.displayName} lacks approval entitlement`);
        const approved = updateTx(session, txId, (item) => ({
          ...item,
          approvedByPersonaId: actor.id,
        }));
        return transition(approved, engine, txId, 'approved', `Approved by ${actor.displayName}`);
      });
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
        const route = tx.route?.options.find((o) => o.id === tx.route?.selectedRouteId);
        const fee = route ? route.feeFlat + (tx.amount * route.costBps) / 10_000 : 0;
        if (tx.type === 'dsvp-settlement') {
          // Atomic DvP: both legs move together — bond in, tokenised cash out.
          s = {
            ...s,
            holdings: s.holdings.map((h) => {
              if (h.assetRef === 'asset-tokenised-bond') {
                return { ...h, quantity: Math.round((h.quantity + tx.amount) * 100) / 100 };
              }
              if (h.assetRef === 'asset-tokenised-deposit') {
                return { ...h, quantity: Math.round((h.quantity - tx.amount - fee) * 100) / 100 };
              }
              return h;
            }),
          };
          s = withAudit(
            s,
            engine,
            'holdings.dsvp-settled',
            `tx:${txId}`,
            `Atomic DvP: +${tx.amount} tBOND face / -${tx.amount + fee} tDEP (simulated)`,
          );
        } else {
          // Settlement effects: debit the funding holding (amount + flat fee).
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
        }
        return transition(
          s,
          engine,
          txId,
          'settled',
          route ? `Settled via ${route.label}` : undefined,
        );
      });
    },
  };
});

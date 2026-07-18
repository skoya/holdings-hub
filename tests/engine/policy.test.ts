import { describe, expect, it } from 'vitest';
import { evaluateTransaction, hasBlockingDecision } from '@/engine/policy';
import { makeSession } from '../fixtures/session';

function transaction(session: ReturnType<typeof makeSession>) {
  return {
    id: 'tx-policy',
    type: 'cross-border-payment' as const,
    state: 'draft' as const,
    amount: 100_000,
    currency: 'GBP',
    assetRef: 'asset-gbp-cash',
    originator: { name: 'A', account: 'SIM:A', jurisdiction: 'GB' as const, institution: 'Meridian' },
    beneficiary: { name: 'B', account: 'SIM:B', jurisdiction: 'CH' as const, institution: 'External' },
    createdAt: session.clock.currentTs,
    updatedAt: session.clock.currentTs,
    events: [{ state: 'draft' as const, ts: session.clock.currentTs }],
    reference: 'SIM-REF',
    metadata: {},
    policyDecisions: [],
  };
}

describe('policy engine', () => {
  it('explains entitlement, limit and approval rules', () => {
    const session = makeSession();
    const actor = session.personas[0]!;
    const decisions = evaluateTransaction(session, transaction(session), actor);
    expect(decisions.map((item) => item.ruleId)).toEqual(['ENT-001', 'LIM-001', 'LIM-002', 'APP-001']);
    expect(decisions.find((item) => item.ruleId === 'APP-001')?.outcome).toBe('require-approval');
  });

  it('blocks a per-transaction limit breach', () => {
    const session = makeSession();
    const actor = { ...session.personas[0]!, limits: { perTransaction: 10, daily: 100, currency: 'GBP' } };
    const decisions = evaluateTransaction(session, { ...transaction(session), amount: 11 }, actor);
    expect(hasBlockingDecision(decisions)).toBe(true);
    expect(decisions.find((item) => item.ruleId === 'LIM-001')?.outcome).toBe('block');
  });

  it('blocks a persona with view-only access', () => {
    const session = makeSession();
    const actor = { ...session.personas[0]!, grants: session.personas[0]!.grants.map((grant) => ({ ...grant, level: 'view' as const })) };
    expect(hasBlockingDecision(evaluateTransaction(session, transaction(session), actor))).toBe(true);
  });
});

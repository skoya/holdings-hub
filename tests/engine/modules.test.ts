import { describe, expect, it } from 'vitest';
import { createEngine } from '@/engine/prng';
import { canTransition, assertTransition, latencyMinutes } from '@/engine/lifecycle';
import { fiatSettlementDate, isBusinessDay, addMinutes } from '@/engine/calendar';
import { buildRouteComparison } from '@/engine/routing';
import { runScreening } from '@/engine/screening';
import { buildTravelRulePacket, TRAVEL_RULE_THRESHOLD_USD } from '@/engine/travelRule';
import { fxRate } from '@/engine/fx';
import type { Party } from '@/schemas';

const party = (name: string): Party => ({
  name,
  account: 'SIM:TEST',
  jurisdiction: 'CH',
  institution: 'Test Bank (fictional)',
});

describe('lifecycle state machine', () => {
  it('allows the happy path and rejects illegal jumps', () => {
    expect(canTransition('draft', 'validated')).toBe(true);
    expect(canTransition('validated', 'pending-approval')).toBe(true);
    expect(canTransition('draft', 'settled')).toBe(false);
    expect(canTransition('settled', 'draft')).toBe(false);
    expect(() => assertTransition('draft', 'settled')).toThrow(/Illegal/);
  });

  it('draws deterministic latency from the latency stream', () => {
    const a = createEngine(5).fork('latency');
    const b = createEngine(5).fork('latency');
    expect(latencyMinutes(a, 'validated')).toBe(latencyMinutes(b, 'validated'));
  });
});

describe('market calendar (M2 minimal)', () => {
  it('knows weekends and holidays', () => {
    expect(isBusinessDay('2026-07-18T10:00:00.000Z', 'GB')).toBe(false); // Saturday
    expect(isBusinessDay('2026-07-20T10:00:00.000Z', 'GB')).toBe(true); // Monday
    expect(isBusinessDay('2026-08-01T10:00:00.000Z', 'CH')).toBe(false); // Swiss national day
  });

  it('slips fiat settlement past cut-off and weekends', () => {
    // Friday 17:00 UTC (after 16:00 cut-off) -> T+2 business days = Tuesday
    const late = fiatSettlementDate('2026-07-17T17:00:00.000Z', 'CH');
    expect(late.iso).toBe('2026-07-21T16:00:00.000Z');
    // Monday 09:00 -> T+1 = Tuesday
    const early = fiatSettlementDate('2026-07-20T09:00:00.000Z', 'CH');
    expect(early.iso).toBe('2026-07-21T16:00:00.000Z');
  });

  it('addMinutes produces UTC ISO strings', () => {
    expect(addMinutes('2026-01-05T09:00:00.000Z', 90)).toBe('2026-01-05T10:30:00.000Z');
  });
});

describe('routing engine', () => {
  it('offers SWIFT and stablecoin routes for a cross-border payment', () => {
    const engine = createEngine(99);
    const cmp = buildRouteComparison({
      routingStream: engine.fork('routing'),
      type: 'cross-border-payment',
      nowTs: '2026-01-05T09:00:00.000Z',
      destJurisdiction: 'CH',
      crossCurrency: true,
    });
    const rails = cmp.options.map((o) => o.rail);
    expect(rails).toContain('swift-correspondent');
    expect(rails).toContain('stablecoin');
    const swift = cmp.options.find((o) => o.rail === 'swift-correspondent')!;
    const stable = cmp.options.find((o) => o.rail === 'stablecoin')!;
    expect(swift.available247).toBe(false);
    expect(stable.available247).toBe(true);
    expect(stable.etaMinutes).toBeLessThan(swift.etaMinutes);
    expect(cmp.selectedRouteId).toBeNull();
  });

  it('is deterministic for a given seed', () => {
    const build = () =>
      buildRouteComparison({
        routingStream: createEngine(7).fork('routing'),
        type: 'cross-border-payment',
        nowTs: '2026-01-05T09:00:00.000Z',
        destJurisdiction: 'CH',
        crossCurrency: true,
      });
    expect(build()).toEqual(build());
  });
});

describe('screening simulation (M2 rules)', () => {
  it('clears ordinary names and explains itself', () => {
    const r = runScreening(party('Helvetia Estates AG'), '2026-01-05T09:00:00.000Z');
    expect(r.outcome).toBe('clear');
    expect(r.note).toMatch(/simulat/i);
  });
  it('flags review and blocked demo names', () => {
    expect(runScreening(party('PEP Review Holdings'), '2026-01-05T09:00:00.000Z').outcome).toBe(
      'review',
    );
    expect(runScreening(party('Embargo Trading Ltd'), '2026-01-05T09:00:00.000Z').outcome).toBe(
      'blocked',
    );
  });
});

describe('travel rule packets', () => {
  it('requires exchange at/above the USD 1,000 threshold', () => {
    const p = buildTravelRulePacket({
      originator: party('A'),
      beneficiary: party('B'),
      amount: TRAVEL_RULE_THRESHOLD_USD,
      amountUsdEquivalent: TRAVEL_RULE_THRESHOLD_USD,
      assetSymbol: 'USDC',
      ts: '2026-01-05T09:00:00.000Z',
    });
    expect(p.required).toBe(true);
    expect(p.exchangedAt).toBe('2026-01-05T09:00:00.000Z');
  });
  it('marks sub-threshold transfers as not required', () => {
    const p = buildTravelRulePacket({
      originator: party('A'),
      beneficiary: party('B'),
      amount: 500,
      amountUsdEquivalent: 500,
      assetSymbol: 'USDC',
      ts: '2026-01-05T09:00:00.000Z',
    });
    expect(p.required).toBe(false);
    expect(p.exchangedAt).toBeNull();
  });
});

describe('fx', () => {
  it('produces rates near the base with seeded jitter, and rejects unknown pairs', () => {
    const market = createEngine(11).fork('market');
    const rate = fxRate(market, 'GBP', 'CHF');
    expect(rate).toBeGreaterThan(1.1);
    expect(rate).toBeLessThan(1.14);
    expect(() => fxRate(market, 'GBP', 'XXX')).toThrow(RangeError);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore, type WizardInput } from '@/stores/sessionStore';
import { SimulationSessionSchema } from '@/schemas';
import { clearAllSessions } from '@/persistence/storage';

const WIZARD: WizardInput = {
  presetId: 'family-office-cio',
  sessionName: 'Integration slice',
  entityName: 'Aldergate Family Office',
  jurisdiction: 'GB',
  relationships: ['custody', 'payments', 'wallet-services', 'fx'],
  personaDisplayName: 'Investment Director (CIO)',
  seed: 20260105,
};

/** Scripted golden path: payment end-to-end plus a USDC transfer. */
function runScript(): string {
  const store = useSessionStore.getState();
  store.createSliceSession(WIZARD);
  const txId = useSessionStore.getState().createPayment({
    amount: 250_000,
    currency: 'GBP',
    beneficiaryName: 'Helvetia Estates AG',
    beneficiaryInstitution: 'External Bank Zurich (fictional)',
    beneficiaryJurisdiction: 'CH',
    rationale: 'Property completion payment (simulated)',
  });
  const s = useSessionStore.getState();
  s.validateTransaction(txId);
  s.approveTransaction(txId);
  s.selectRoute(txId, 'route-stablecoin');
  s.runSettlement(txId);
  const usdcId = s.createUsdcTransfer({
    amount: 25_000,
    beneficiaryName: 'Geneva office wallet',
    beneficiaryInstitution: 'External Digital Custody SA (fictional)',
    beneficiaryJurisdiction: 'CH',
  });
  s.validateTransaction(usdcId);
  s.approveTransaction(usdcId);
  s.selectRoute(usdcId, 'route-stablecoin');
  s.runSettlement(usdcId);
  return useSessionStore.getState().exportSessionJson();
}

describe('vertical slice integration (PLAN Section 40 M2)', () => {
  beforeEach(async () => {
    await clearAllSessions();
    useSessionStore.getState().clearSession();
  });

  it('runs the payment through the full lifecycle with audit and holdings effects', () => {
    const store = useSessionStore.getState();
    store.createSliceSession(WIZARD);
    const before = useSessionStore.getState().session!;
    const gbpBefore = before.holdings.find((h) => h.assetRef === 'asset-gbp-cash')!.quantity;

    const txId = useSessionStore.getState().createPayment({
      amount: 250_000,
      currency: 'GBP',
      beneficiaryName: 'Helvetia Estates AG',
      beneficiaryInstitution: 'External Bank Zurich (fictional)',
      beneficiaryJurisdiction: 'CH',
    });
    const api = useSessionStore.getState();
    api.validateTransaction(txId);
    api.approveTransaction(txId);
    api.selectRoute(txId, 'route-swift');
    api.runSettlement(txId);

    const session = useSessionStore.getState().session!;
    const tx = session.transactions.find((t) => t.id === txId)!;
    expect(tx.state).toBe('settled');
    expect(tx.screening?.outcome).toBe('clear');
    expect(tx.route?.selectedRouteId).toBe('route-swift');
    expect(tx.events.map((e) => e.state)).toEqual([
      'draft',
      'validated',
      'pending-approval',
      'approved',
      'routing',
      'in-flight',
      'settled',
    ]);
    // Timestamps strictly non-decreasing (sim clock).
    const ts = tx.events.map((e) => e.ts);
    expect([...ts].sort()).toEqual(ts);

    const gbpAfter = session.holdings.find((h) => h.assetRef === 'asset-gbp-cash')!.quantity;
    expect(gbpAfter).toBeLessThan(gbpBefore - 250_000); // amount + fees
    expect(
      session.auditLog.filter((e) => e.objectRef === `tx:${txId}`).length,
    ).toBeGreaterThanOrEqual(6);
    expect(SimulationSessionSchema.parse(session)).toBeTruthy();
  });

  it('blocks screening-hit beneficiaries and fails the transaction', () => {
    useSessionStore.getState().createSliceSession(WIZARD);
    const txId = useSessionStore.getState().createPayment({
      amount: 10_000,
      currency: 'GBP',
      beneficiaryName: 'Embargo Trading Ltd',
      beneficiaryInstitution: 'Somewhere Bank',
      beneficiaryJurisdiction: 'CH',
    });
    useSessionStore.getState().validateTransaction(txId);
    const tx = useSessionStore.getState().session!.transactions.find((t) => t.id === txId)!;
    expect(tx.state).toBe('failed');
    expect(tx.screening?.outcome).toBe('blocked');
  });

  it('fails transactions above the per-transaction limit at validation', () => {
    useSessionStore.getState().createSliceSession(WIZARD);
    const txId = useSessionStore.getState().createPayment({
      amount: 2_000_000,
      currency: 'GBP',
      beneficiaryName: 'Helvetia Estates AG',
      beneficiaryInstitution: 'External Bank Zurich (fictional)',
      beneficiaryJurisdiction: 'CH',
    });
    useSessionStore.getState().validateTransaction(txId);
    const tx = useSessionStore.getState().session!.transactions.find((t) => t.id === txId)!;
    expect(tx.state).toBe('failed');
  });

  it('attaches a required Travel Rule packet to the USDC transfer', () => {
    useSessionStore.getState().createSliceSession(WIZARD);
    const txId = useSessionStore.getState().createUsdcTransfer({
      amount: 25_000,
      beneficiaryName: 'Geneva office wallet',
      beneficiaryInstitution: 'External Digital Custody SA (fictional)',
      beneficiaryJurisdiction: 'CH',
    });
    const tx = useSessionStore.getState().session!.transactions.find((t) => t.id === txId)!;
    expect(tx.travelRule?.required).toBe(true);
    expect(tx.travelRule?.originatorVasp).toMatch(/Meridian/);
  });

  it('export -> import round-trips byte-identically', () => {
    const json = runScript();
    const parsed = SimulationSessionSchema.parse(JSON.parse(json));
    useSessionStore.getState().clearSession();
    useSessionStore.getState().adoptSession(parsed);
    const reExported = useSessionStore.getState().exportSessionJson();
    expect(reExported).toBe(json);
  });

  it('same seed + same action script => identical exported session (determinism)', () => {
    const first = runScript();
    useSessionStore.getState().clearSession();
    const second = runScript();
    expect(second).toBe(first);
  });
});

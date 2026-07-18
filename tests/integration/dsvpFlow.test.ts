import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '@/stores/sessionStore';
import { clearAllSessions } from '@/persistence/storage';

describe('DvP settlement demo (PLAN Section 10/40 M3)', () => {
  beforeEach(async () => {
    await clearAllSessions();
    useSessionStore.getState().clearSession();
  });

  it('settles tokenised bond against tokenised deposit atomically', () => {
    useSessionStore.getState().createSliceSession({
      presetId: 'asset-manager-dsvp',
      sessionName: 'DvP demo',
      entityName: 'Northgate Asset Management',
      jurisdiction: 'GB',
      relationships: ['custody', 'brokerage', 'tokenisation-agent'],
      personaDisplayName: 'Portfolio Manager',
      seed: 20260319,
    });
    const before = useSessionStore.getState().session!;
    const bondBefore = before.holdings.find((h) => h.assetRef === 'asset-tokenised-bond')!.quantity;
    const depBefore = before.holdings.find(
      (h) => h.assetRef === 'asset-tokenised-deposit',
    )!.quantity;

    const txId = useSessionStore.getState().createDsvpDemo();
    const api = useSessionStore.getState();
    api.validateTransaction(txId);
    // Four-eyes: the 1,000,000 DvP is above threshold — an independent
    // signatory (not the initiating portfolio manager) approves it.
    const signatory = api.session!.personas.find((p) => p.role === 'authorised-signatory')!;
    api.switchPersona(signatory.id);
    useSessionStore.getState().approveTransaction(txId);
    api.selectRoute(txId, 'route-internal');
    api.runSettlement(txId);

    const session = useSessionStore.getState().session!;
    const tx = session.transactions.find((t) => t.id === txId)!;
    expect(tx.state).toBe('settled');
    expect(tx.type).toBe('dsvp-settlement');
    expect(tx.route?.options[0]?.label).toContain('atomic DvP');

    const bondAfter = session.holdings.find((h) => h.assetRef === 'asset-tokenised-bond')!.quantity;
    const depAfter = session.holdings.find(
      (h) => h.assetRef === 'asset-tokenised-deposit',
    )!.quantity;
    expect(bondAfter).toBe(bondBefore + 1_000_000);
    expect(depAfter).toBeLessThanOrEqual(depBefore - 1_000_000);
    expect(session.auditLog.some((e) => e.action === 'holdings.dsvp-settled')).toBe(true);
  });

  it('refuses the demo without both tokenised legs', () => {
    useSessionStore.getState().createSliceSession({
      presetId: 'family-office-cio',
      sessionName: 'No DvP legs',
      entityName: 'Aldergate Family Office',
      jurisdiction: 'GB',
      relationships: ['custody', 'payments'],
      personaDisplayName: 'CIO',
      seed: 1,
    });
    expect(() => useSessionStore.getState().createDsvpDemo()).toThrow(/tokenised bond/);
  });
});

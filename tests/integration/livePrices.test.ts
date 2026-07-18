import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore, type WizardInput } from '@/stores/sessionStore';
import { clearAllSessions } from '@/persistence/storage';

const WIZARD: WizardInput = {
  presetId: 'family-office-cio',
  sessionName: 'Live prices',
  entityName: 'Aldergate Family Office',
  jurisdiction: 'GB',
  relationships: ['custody', 'payments', 'wallet-services'],
  personaDisplayName: 'CIO',
  seed: 20260105,
};

describe('live-price toggle with deterministic fallback (PLAN Section 25)', () => {
  beforeEach(async () => {
    await clearAllSessions();
    useSessionStore.getState().clearSession();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to deterministic mode when CoinGecko fails', async () => {
    useSessionStore.getState().createSliceSession(WIZARD);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await useSessionStore.getState().setLivePrices(true);

    const st = useSessionStore.getState();
    expect(st.livePrices).toBeNull();
    expect(st.session!.settings.livePrices).toBe(false);
    expect(st.lastError).toMatch(/deterministic/i);
    expect(st.session!.auditLog.some((e) => e.action === 'settings.live-prices-fallback')).toBe(
      true,
    );
  });

  it('records live mode when CoinGecko succeeds and reverts on toggle off', async () => {
    useSessionStore.getState().createSliceSession(WIZARD);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ 'usd-coin': { usd: 1 } }),
      }),
    );

    await useSessionStore.getState().setLivePrices(true);
    let st = useSessionStore.getState();
    expect(st.session!.settings.livePrices).toBe(true);
    expect(st.livePrices).toMatchObject({ USDC: 1 });

    await useSessionStore.getState().setLivePrices(false);
    st = useSessionStore.getState();
    expect(st.session!.settings.livePrices).toBe(false);
    expect(st.livePrices).toBeNull();
  });
});

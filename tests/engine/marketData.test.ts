import { describe, expect, it } from 'vitest';
import { fetchLivePrices } from '@/engine/marketData';

function mockFetch(status: number, body: unknown): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('marketData.fetchLivePrices (PLAN Section 25)', () => {
  it('maps simulated symbols to USD reference prices on success', async () => {
    const impl = mockFetch(200, {
      bitcoin: { usd: 60000 },
      ethereum: { usd: 3000 },
      'usd-coin': { usd: 1 },
    });
    const result = await fetchLivePrices(['BTC', 'ETH', 'USDC'], '2026-01-01T00:00:00.000Z', impl);
    expect(result.prices).toEqual({ BTC: 60000, ETH: 3000, USDC: 1 });
    expect(result.fetchedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('throws on a non-ok response so callers fall back to deterministic', async () => {
    await expect(fetchLivePrices(['BTC'], 'now', mockFetch(429, {}))).rejects.toThrow();
  });

  it('throws when no symbol is live-priceable', async () => {
    await expect(fetchLivePrices(['GBP'], 'now', mockFetch(200, {}))).rejects.toThrow();
  });

  it('throws when the response carries no usable prices', async () => {
    await expect(
      fetchLivePrices(['BTC'], 'now', mockFetch(200, { bitcoin: {} })),
    ).rejects.toThrow();
  });
});

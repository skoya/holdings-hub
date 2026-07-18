/**
 * Optional live market data (PLAN Section 25). CoinGecko public API, read-only,
 * CORS-safe, free tier. Live prices are a display overlay only: they never
 * mutate stored holdings or the audit trail, so the determinism guarantee is
 * untouched. Any error must fall back to deterministic values (the default).
 */

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

/** Simulated symbol → CoinGecko id. */
export const LIVE_PRICE_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDC: 'usd-coin',
  EURC: 'euro-coin',
};

export interface LivePriceResult {
  /** symbol → reference price in USD */
  prices: Record<string, number>;
  fetchedAt: string;
}

/**
 * Fetch USD reference prices for the given simulated symbols. Throws on any
 * network/parse error or if no usable price is returned — callers must catch
 * and fall back to deterministic valuations.
 */
export async function fetchLivePrices(
  symbols: string[],
  now: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LivePriceResult> {
  const pairs = symbols
    .map((symbol) => [symbol, LIVE_PRICE_IDS[symbol]] as const)
    .filter((pair): pair is [string, string] => Boolean(pair[1]));
  if (pairs.length === 0) throw new Error('No live-priceable symbols');

  const ids = [...new Set(pairs.map(([, id]) => id))].join(',');
  const url = `${COINGECKO_URL}?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);

  const data = (await res.json()) as Record<string, { usd?: number }>;
  const prices: Record<string, number> = {};
  for (const [symbol, id] of pairs) {
    const usd = data[id]?.usd;
    if (typeof usd === 'number' && Number.isFinite(usd)) prices[symbol] = usd;
  }
  if (Object.keys(prices).length === 0) throw new Error('CoinGecko returned no usable prices');
  return { prices, fetchedAt: now };
}

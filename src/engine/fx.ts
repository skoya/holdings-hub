import type { Stream } from './prng';

/**
 * Deterministic FX reference rates with a small seeded jitter from the
 * 'market' stream. Live-mode (CoinGecko) arrives in M5 and never affects
 * these deterministic paths.
 */
const BASE_RATES: Record<string, number> = {
  'GBP:CHF': 1.12,
  'CHF:GBP': 1 / 1.12,
  'GBP:USD': 1.27,
  'USD:GBP': 1 / 1.27,
  'USD:CHF': 0.88,
  'CHF:USD': 1 / 0.88,
  'EUR:GBP': 0.85,
  'GBP:EUR': 1 / 0.85,
  'EUR:USD': 1.08,
  'USD:EUR': 1 / 1.08,
  'EUR:CHF': 0.94,
  'CHF:EUR': 1 / 0.94,
  'GBP:GBP': 1,
  'CHF:CHF': 1,
  'USD:USD': 1,
  'EUR:EUR': 1,
};

export function fxRate(market: Stream, from: string, to: string): number {
  const base = BASE_RATES[`${from}:${to}`];
  if (base === undefined) throw new RangeError(`No simulated FX rate for ${from}->${to}`);
  if (from === to) return 1;
  // +/- 0.5% seeded jitter
  const jitter = 1 + (market.next() - 0.5) * 0.01;
  return base * jitter;
}

export function convert(market: Stream, amount: number, from: string, to: string): number {
  return amount * fxRate(market, from, to);
}

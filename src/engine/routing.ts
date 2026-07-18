import type { Jurisdiction, RouteComparison, TransactionType } from '@/schemas';
import { addMinutes, fiatSettlementDate } from './calendar';
import type { Stream } from './prng';

/**
 * Route recommendation engine (PLAN Section 11). Candidate routes are scored
 * on simulated cost, speed, FX spread and calendar constraints. The user's
 * selection plus the full comparison snapshot are recorded in the audit trail.
 */
export function buildRouteComparison(args: {
  routingStream: Stream;
  type: TransactionType;
  nowTs: string;
  destJurisdiction: Jurisdiction;
  crossCurrency: boolean;
}): RouteComparison {
  const { routingStream: s, type, nowTs, destJurisdiction, crossCurrency } = args;
  const options = [];

  if (type === 'cross-border-payment') {
    const fiat = fiatSettlementDate(nowTs, destJurisdiction);
    options.push({
      id: 'route-swift',
      rail: 'swift-correspondent' as const,
      label: 'SWIFT correspondent chain',
      costBps: s.nextInt(15, 35),
      feeFlat: 25,
      fxSpreadBps: crossCurrency ? s.nextInt(20, 40) : 0,
      etaMinutes: Math.max(
        60,
        Math.round((new Date(fiat.iso).getTime() - new Date(nowTs).getTime()) / 60_000),
      ),
      settlementDate: fiat.iso,
      cutoffNote: fiat.note,
      controls: ['sanctions-screening', 'correspondent-limits'],
      available247: false,
    });
    const eta = s.nextInt(5, 20);
    options.push({
      id: 'route-stablecoin',
      rail: 'stablecoin' as const,
      label: 'USDC stablecoin rail (simulated on-chain)',
      costBps: s.nextInt(2, 8),
      feeFlat: 1,
      fxSpreadBps: crossCurrency ? s.nextInt(5, 15) : 0,
      etaMinutes: eta,
      settlementDate: addMinutes(nowTs, eta),
      cutoffNote: 'no cut-off — settles 24/7 including weekends and holidays',
      controls: ['sanctions-screening', 'travel-rule', 'wallet-screening'],
      available247: true,
    });
  } else if (type === 'stablecoin-transfer') {
    const eta = s.nextInt(3, 12);
    options.push({
      id: 'route-stablecoin',
      rail: 'stablecoin' as const,
      label: 'USDC on-chain transfer (simulated)',
      costBps: s.nextInt(1, 4),
      feeFlat: 0.5,
      fxSpreadBps: 0,
      etaMinutes: eta,
      settlementDate: addMinutes(nowTs, eta),
      cutoffNote: 'no cut-off — settles 24/7',
      controls: ['travel-rule', 'wallet-screening'],
      available247: true,
    });
  } else {
    const eta = s.nextInt(1, 5);
    options.push({
      id: 'route-internal',
      rail: 'internal-book' as const,
      label:
        type === 'dsvp-settlement'
          ? 'Simulated permissioned ledger (atomic DvP)'
          : 'Meridian internal book transfer',
      costBps: 0,
      feeFlat: 0,
      fxSpreadBps: 0,
      etaMinutes: eta,
      settlementDate: addMinutes(nowTs, eta),
      cutoffNote:
        type === 'dsvp-settlement'
          ? 'both legs settle atomically — no principal risk window'
          : 'internal — immediate',
      controls: type === 'dsvp-settlement' ? ['dvp-atomicity', 'ledger-finality'] : [],
      available247: true,
    });
  }

  return { generatedAt: nowTs, options, selectedRouteId: null };
}

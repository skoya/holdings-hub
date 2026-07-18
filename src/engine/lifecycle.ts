import type { TransactionState } from '@/schemas';
import type { Stream } from './prng';

/**
 * Deterministic transaction lifecycle state machine (PLAN Section 10):
 * draft → validated → pending-approval → approved → routing → in-flight →
 * settled | failed | returned. Terminal failure paths are exercised via
 * screening outcomes; latency between states draws from the 'latency' stream.
 */
export const HAPPY_PATH: TransactionState[] = [
  'draft',
  'validated',
  'pending-approval',
  'approved',
  'routing',
  'in-flight',
  'settled',
];

export const TERMINAL_STATES: TransactionState[] = ['settled', 'failed', 'returned'];

const ALLOWED: Record<TransactionState, TransactionState[]> = {
  draft: ['validated', 'failed'],
  validated: ['pending-approval', 'failed'],
  'pending-approval': ['approved', 'failed'],
  approved: ['routing'],
  routing: ['in-flight'],
  'in-flight': ['settled', 'failed', 'returned'],
  settled: [],
  failed: [],
  returned: [],
};

export function canTransition(from: TransactionState, to: TransactionState): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: TransactionState, to: TransactionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal transaction transition: ${from} -> ${to}`);
  }
}

/** Simulated processing latency (minutes) between lifecycle states. */
export function latencyMinutes(latency: Stream, to: TransactionState): number {
  switch (to) {
    case 'validated':
      return latency.nextInt(1, 3);
    case 'pending-approval':
      return latency.nextInt(1, 5);
    case 'approved':
      return latency.nextInt(2, 30);
    case 'routing':
      return latency.nextInt(1, 4);
    case 'in-flight':
      return latency.nextInt(1, 10);
    default:
      return latency.nextInt(1, 60);
  }
}

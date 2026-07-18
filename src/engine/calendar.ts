import { FIAT_CUTOFF_UTC_HOUR, HOLIDAYS_2026 } from '@/config/calendars';
import type { Jurisdiction } from '@/schemas';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isBusinessDay(iso: string, jurisdiction: Jurisdiction): boolean {
  const d = new Date(iso);
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !HOLIDAYS_2026[jurisdiction].includes(dateKey(d));
}

/**
 * Next fiat settlement instant for a SWIFT-style rail: T+1 business day in the
 * destination jurisdiction (T+2 if initiated after the cut-off), settling at
 * the cut-off hour UTC.
 */
export function fiatSettlementDate(nowIso: string, dest: Jurisdiction): {
  iso: string;
  note: string;
} {
  const now = new Date(nowIso);
  const missedCutoff = now.getUTCHours() >= FIAT_CUTOFF_UTC_HOUR;
  let candidate = new Date(now.getTime());
  let daysToAdd = missedCutoff ? 2 : 1;
  while (daysToAdd > 0) {
    candidate = new Date(candidate.getTime() + DAY_MS);
    if (isBusinessDay(candidate.toISOString(), dest)) daysToAdd -= 1;
  }
  candidate.setUTCHours(FIAT_CUTOFF_UTC_HOUR, 0, 0, 0);
  const skippedNote = missedCutoff
    ? `initiated after ${FIAT_CUTOFF_UTC_HOUR}:00 UTC cut-off — value date slips a day`
    : `before ${FIAT_CUTOFF_UTC_HOUR}:00 UTC cut-off`;
  return {
    iso: candidate.toISOString(),
    note: `${skippedNote}; weekends/holidays in destination skipped`,
  };
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

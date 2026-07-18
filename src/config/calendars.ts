import type { Jurisdiction } from '@/schemas';

/**
 * Minimal 2026 market calendar for the M2 slice (GB/CH). Expanded to all
 * jurisdictions with full holiday JSON + cut-off times in M5 (PLAN Section 26).
 */
export const HOLIDAYS_2026: Record<Jurisdiction, string[]> = {
  GB: [
    '2026-01-01',
    '2026-04-03',
    '2026-04-06',
    '2026-05-04',
    '2026-05-25',
    '2026-08-31',
    '2026-12-25',
    '2026-12-28',
  ],
  CH: [
    '2026-01-01',
    '2026-01-02',
    '2026-04-03',
    '2026-04-06',
    '2026-05-14',
    '2026-05-25',
    '2026-08-01',
    '2026-12-25',
  ],
  US: ['2026-01-01', '2026-07-03', '2026-11-26', '2026-12-25'],
  JP: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-05-04', '2026-05-05'],
  DE: ['2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25'],
  SG: ['2026-01-01', '2026-02-17', '2026-05-01', '2026-08-10', '2026-12-25'],
};

/** Fiat payment cut-off (UTC hour) used for SWIFT-style settlement estimates. */
export const FIAT_CUTOFF_UTC_HOUR = 16;

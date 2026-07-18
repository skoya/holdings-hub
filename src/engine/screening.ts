import type { Party, ScreeningResult } from '@/schemas';

/**
 * Sanctions/name screening simulation (PLAN Section 12). M2 keeps outcomes
 * rule-based and fully deterministic: demo names trigger review/blocked;
 * everything else clears. Seeded probabilistic variety plus explainable
 * policy-decision records arrive with the M4 controls milestone.
 */
export function runScreening(beneficiary: Party, checkedAt: string): ScreeningResult {
  const name = beneficiary.name.toLowerCase();
  if (/sanction|embargo|blocked/.test(name)) {
    return {
      outcome: 'blocked',
      checkedAt,
      note: `Simulated screening hit on beneficiary name "${beneficiary.name}" — transaction blocked (simulation).`,
    };
  }
  if (/review|pep/.test(name)) {
    return {
      outcome: 'review',
      checkedAt,
      note: `Simulated screening flag on "${beneficiary.name}" — manual review path (simulation).`,
    };
  }
  return {
    outcome: 'clear',
    checkedAt,
    note: 'Simulated screening clear — no list matches.',
  };
}

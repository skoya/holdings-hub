import type { Persona, PolicyDecision, SimulationSession, Transaction } from '@/schemas';

export function evaluateTransaction(
  session: SimulationSession,
  transaction: Transaction,
  actor: Persona,
): PolicyDecision[] {
  const decisions: PolicyDecision[] = [];
  const grant = actor.grants.find(
    (item) =>
      item.relationship ===
      (transaction.type === 'stablecoin-transfer' ? 'wallet-services' : 'payments'),
  );

  if (!grant || grant.level === 'view') {
    decisions.push({
      ruleId: 'ENT-001',
      outcome: 'block',
      explanation: `${actor.displayName} lacks initiation entitlement for this transaction type.`,
    });
  } else {
    decisions.push({
      ruleId: 'ENT-001',
      outcome: 'pass',
      explanation: `${actor.displayName} has ${grant.level} entitlement.`,
    });
  }

  if (actor.limits && transaction.amount > actor.limits.perTransaction) {
    decisions.push({
      ruleId: 'LIM-001',
      outcome: 'block',
      explanation: `${transaction.amount} ${transaction.currency} exceeds the ${actor.limits.perTransaction} ${actor.limits.currency} per-transaction limit.`,
    });
  } else {
    decisions.push({
      ruleId: 'LIM-001',
      outcome: 'pass',
      explanation: 'Transaction is within the actor per-transaction limit.',
    });
  }

  const spentToday = session.transactions
    .filter(
      (item) =>
        item.id !== transaction.id &&
        item.currency === transaction.currency &&
        item.createdAt.slice(0, 10) === transaction.createdAt.slice(0, 10) &&
        !['failed', 'returned'].includes(item.state),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  if (actor.limits && spentToday + transaction.amount > actor.limits.daily) {
    decisions.push({
      ruleId: 'LIM-002',
      outcome: 'block',
      explanation: `Daily total ${spentToday + transaction.amount} ${transaction.currency} exceeds the ${actor.limits.daily} ${actor.limits.currency} limit.`,
    });
  } else {
    decisions.push({
      ruleId: 'LIM-002',
      outcome: 'pass',
      explanation: 'Transaction is within the daily limit.',
    });
  }

  const threshold = Math.min(actor.limits?.perTransaction ?? 100_000, 100_000);
  decisions.push({
    ruleId: 'APP-001',
    outcome: transaction.amount >= threshold ? 'require-approval' : 'pass',
    explanation:
      transaction.amount >= threshold
        ? `Four-eyes approval is required at or above ${threshold} ${transaction.currency}.`
        : `Transaction is below the ${threshold} ${transaction.currency} four-eyes threshold.`,
  });

  return decisions;
}

export function hasBlockingDecision(decisions: PolicyDecision[]): boolean {
  return decisions.some((decision) => decision.outcome === 'block');
}

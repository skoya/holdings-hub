import type { Party, TravelRulePacket } from '@/schemas';

/**
 * Travel Rule simulation (FATF R.16, PLAN Section 12): originator/beneficiary
 * data exchange mock for digital-asset transfers at/above the USD 1,000
 * threshold. The packet is a visible artefact on the transaction detail view.
 */
export const TRAVEL_RULE_THRESHOLD_USD = 1000;

export function buildTravelRulePacket(args: {
  originator: Party;
  beneficiary: Party;
  amountUsdEquivalent: number;
  amount: number;
  assetSymbol: string;
  ts: string;
}): TravelRulePacket {
  const required = args.amountUsdEquivalent >= TRAVEL_RULE_THRESHOLD_USD;
  return {
    required,
    thresholdCcy: 'USD',
    thresholdAmount: TRAVEL_RULE_THRESHOLD_USD,
    originator: args.originator,
    beneficiary: args.beneficiary,
    originatorVasp: 'Meridian Bank Wallet Services (simulated VASP)',
    beneficiaryVasp: `${args.beneficiary.institution} (simulated VASP)`,
    assetSymbol: args.assetSymbol,
    amount: args.amount,
    exchangedAt: required ? args.ts : null,
  };
}

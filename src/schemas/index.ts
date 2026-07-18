import { z } from 'zod';

/**
 * Core data schemas (PLAN Section 37). One source of truth for compile-time
 * types (z.infer) and runtime validation of imported JSON. All schemas are
 * versioned together under SCHEMA_VERSION; migrations live in ./migrations.
 *
 * v2 (M2): adds the simulation clock, expands Transaction with parties,
 * route comparison snapshot, Travel Rule packet and lifecycle events.
 */

export const SCHEMA_VERSION = 2;

/** Fixed simulation epoch — all sim-clock time derives from here (determinism). */
export const SIM_EPOCH = '2026-01-05T09:00:00.000Z';

export const AssetClassSchema = z.enum([
  'cash',
  'equity',
  'bond',
  'fund',
  'tokenised',
  'stablecoin',
  'crypto',
  'defi',
]);

export const RelationshipSchema = z.enum([
  'custody',
  'payments',
  'wallet-services',
  'brokerage',
  'fx',
  'lending',
  'fund-administration',
  'tokenisation-agent',
]);

export const EntityTypeSchema = z.enum([
  'single-family-office',
  'multi-family-office',
  'corporate-treasury',
  'asset-manager',
  'fund',
  'pension-scheme',
  'hnw-individual',
  'fintech-psp',
  'broker-dealer',
]);

export const PersonaRoleSchema = z.enum([
  'cio',
  'treasurer',
  'operations-manager',
  'compliance-officer',
  'authorised-signatory',
  'portfolio-manager',
  'family-principal',
]);

export const EntitlementLevelSchema = z.enum(['view', 'initiate', 'approve', 'admin']);

export const JurisdictionSchema = z.enum(['GB', 'CH', 'US', 'JP', 'DE', 'SG']);

export const AssetSchema = z.object({
  id: z.string().min(1),
  class: AssetClassSchema,
  symbol: z.string().min(1),
  name: z.string().min(1),
  currency: z.string().length(3),
  network: z.string().optional(),
  metadata: z.record(z.string()).default({}),
});

export const CustodyLocationSchema = z.enum(['meridian', 'external-custodian', 'on-chain']);

export const ValuationSchema = z.object({
  value: z.number().finite(),
  currency: z.string().length(3),
  asOf: z.string().datetime(),
  mode: z.enum(['deterministic', 'live']),
});

export const HoldingSchema = z.object({
  id: z.string().min(1),
  assetRef: z.string().min(1),
  quantity: z.number().finite(),
  valuation: ValuationSchema,
  custodyLocation: CustodyLocationSchema,
  network: z.string().optional(),
  encumbrance: z.enum(['free', 'locked', 'pledged']).default('free'),
  authoritativeSource: z.enum(['meridian', 'external']),
});

export const EntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: EntityTypeSchema,
  jurisdiction: JurisdictionSchema,
  // Fictional LEI-like identifier; SIM- prefix marks it as non-real (Section 29).
  lei: z.string().regex(/^SIM-[A-Z0-9]{16}$/),
  parentId: z.string().nullable().default(null),
  relationships: z.array(RelationshipSchema).default([]),
});

export const EntitlementGrantSchema = z.object({
  relationship: RelationshipSchema,
  assetClass: AssetClassSchema,
  level: EntitlementLevelSchema,
});

export const PersonaLimitsSchema = z.object({
  perTransaction: z.number().positive(),
  daily: z.number().positive(),
  currency: z.string().length(3),
});

export const PersonaSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  role: PersonaRoleSchema,
  displayName: z.string().min(1),
  grants: z.array(EntitlementGrantSchema).default([]),
  limits: PersonaLimitsSchema.optional(),
});

export const AuditEventSchema = z.object({
  id: z.string().min(1),
  ts: z.string().datetime(), // UTC ISO 8601 (simulation clock)
  actorPersonaId: z.string().nullable(),
  action: z.string().min(1),
  objectRef: z.string().min(1),
  snapshotHash: z.string().min(1),
  rationale: z.string().optional(),
});

export const TransactionTypeSchema = z.enum([
  'cross-border-payment',
  'domestic-payment',
  'internal-transfer',
  'fx-conversion',
  'stablecoin-transfer',
  'stablecoin-mint',
  'stablecoin-redeem',
  'security-trade',
  'tokenised-subscription',
  'tokenised-redemption',
  'dsvp-settlement',
]);

export const TransactionStateSchema = z.enum([
  'draft',
  'validated',
  'pending-approval',
  'approved',
  'routing',
  'in-flight',
  'settled',
  'failed',
  'returned',
]);

export const PartySchema = z.object({
  name: z.string().min(1),
  // Deliberately fictional account identifiers (SIM: prefix, Section 29).
  account: z.string().min(1),
  jurisdiction: JurisdictionSchema,
  institution: z.string().min(1),
});

export const RouteOptionSchema = z.object({
  id: z.string().min(1),
  rail: z.enum(['swift-correspondent', 'stablecoin', 'internal-book', 'domestic-rtgs']),
  label: z.string().min(1),
  costBps: z.number().nonnegative(),
  feeFlat: z.number().nonnegative(),
  fxSpreadBps: z.number().nonnegative(),
  etaMinutes: z.number().positive(),
  settlementDate: z.string().datetime(),
  cutoffNote: z.string(),
  controls: z.array(z.string()).default([]),
  available247: z.boolean(),
});

export const RouteComparisonSchema = z.object({
  generatedAt: z.string().datetime(),
  options: z.array(RouteOptionSchema).min(1),
  selectedRouteId: z.string().nullable().default(null),
});

export const TravelRulePacketSchema = z.object({
  required: z.boolean(),
  thresholdCcy: z.string().length(3),
  thresholdAmount: z.number().positive(),
  originator: PartySchema,
  beneficiary: PartySchema,
  originatorVasp: z.string().min(1),
  beneficiaryVasp: z.string().min(1),
  assetSymbol: z.string().min(1),
  amount: z.number().positive(),
  exchangedAt: z.string().datetime().nullable(),
});

export const LifecycleEventSchema = z.object({
  state: TransactionStateSchema,
  ts: z.string().datetime(),
  note: z.string().optional(),
});

export const ScreeningResultSchema = z.object({
  outcome: z.enum(['clear', 'review', 'blocked']),
  checkedAt: z.string().datetime(),
  note: z.string(),
});

export const PolicyDecisionSchema = z.object({
  ruleId: z.string().min(1),
  outcome: z.enum(['pass', 'require-approval', 'block']),
  explanation: z.string().min(1),
});

export const TransactionSchema = z.object({
  id: z.string().min(1),
  type: TransactionTypeSchema,
  state: TransactionStateSchema,
  amount: z.number().positive(),
  currency: z.string().length(3),
  assetRef: z.string().min(1),
  originator: PartySchema,
  beneficiary: PartySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  events: z.array(LifecycleEventSchema).default([]),
  route: RouteComparisonSchema.optional(),
  travelRule: TravelRulePacketSchema.optional(),
  screening: ScreeningResultSchema.optional(),
  policyDecisions: z.array(PolicyDecisionSchema).default([]),
  initiatedByPersonaId: z.string().optional(),
  approvedByPersonaId: z.string().optional(),
  reference: z.string().min(1),
  metadata: z.record(z.string()).default({}),
});

export const SessionSettingsSchema = z.object({
  locale: z.enum(['en', 'de', 'fr', 'ja']).default('en'),
  defiEnabled: z.boolean().default(false),
  livePrices: z.boolean().default(false),
});

export const EngineStateSchema = z.object({
  seed: z.number().int(),
  streams: z.record(z.number().int().nonnegative()),
});

export const ClockSchema = z.object({
  currentTs: z.string().datetime(),
});

export const PinnedPositionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });

export const SimulationSessionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  schemaVersion: z.literal(SCHEMA_VERSION),
  seed: z.number().int(),
  engineState: EngineStateSchema,
  clock: ClockSchema.default({ currentTs: SIM_EPOCH }),
  entities: z.array(EntitySchema),
  personas: z.array(PersonaSchema),
  activePersonaId: z.string().nullable().default(null),
  holdings: z.array(HoldingSchema),
  transactions: z.array(TransactionSchema).default([]),
  auditLog: z.array(AuditEventSchema).default([]),
  settings: SessionSettingsSchema.default({}),
  pinnedPositions: z.record(PinnedPositionSchema).default({}),
});

export type AssetClass = z.infer<typeof AssetClassSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type PersonaRole = z.infer<typeof PersonaRoleSchema>;
export type EntitlementLevel = z.infer<typeof EntitlementLevelSchema>;
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Holding = z.infer<typeof HoldingSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type EntitlementGrant = z.infer<typeof EntitlementGrantSchema>;
export type PersonaLimits = z.infer<typeof PersonaLimitsSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type TransactionState = z.infer<typeof TransactionStateSchema>;
export type Party = z.infer<typeof PartySchema>;
export type RouteOption = z.infer<typeof RouteOptionSchema>;
export type RouteComparison = z.infer<typeof RouteComparisonSchema>;
export type TravelRulePacket = z.infer<typeof TravelRulePacketSchema>;
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;
export type ScreeningResult = z.infer<typeof ScreeningResultSchema>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type SessionSettings = z.infer<typeof SessionSettingsSchema>;
export type SimulationSession = z.infer<typeof SimulationSessionSchema>;

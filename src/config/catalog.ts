import {
  AssetSchema,
  type Asset,
  type EntitlementGrant,
  type EntityType,
  type Jurisdiction,
  type PersonaLimits,
  type PersonaRole,
  type Relationship,
} from '@/schemas';
import { z } from 'zod';

/**
 * Configuration-driven catalogue (PLAN Section 32): entity templates, persona
 * templates, the full asset catalogue and scenario presets. Everything is
 * Zod-validated at load time; adding a scenario is a config change, not an
 * engine change.
 */

// ---------------------------------------------------------------------------
// Asset catalogue (PLAN Section 8)
// ---------------------------------------------------------------------------

export const ASSETS: Asset[] = z.array(AssetSchema).parse([
  {
    id: 'asset-gbp-cash',
    class: 'cash',
    symbol: 'GBP',
    name: 'Pound sterling cash',
    currency: 'GBP',
    metadata: { custodyNote: 'Meridian payments & cash management' },
  },
  {
    id: 'asset-chf-cash',
    class: 'cash',
    symbol: 'CHF',
    name: 'Swiss franc cash',
    currency: 'CHF',
    metadata: {},
  },
  {
    id: 'asset-usd-cash',
    class: 'cash',
    symbol: 'USD',
    name: 'US dollar cash',
    currency: 'USD',
    metadata: {},
  },
  {
    id: 'asset-eur-cash',
    class: 'cash',
    symbol: 'EUR',
    name: 'Euro cash',
    currency: 'EUR',
    metadata: {},
  },
  {
    id: 'asset-usdc',
    class: 'stablecoin',
    symbol: 'USDC',
    name: 'USD Coin (simulated balance)',
    currency: 'USD',
    network: 'sim-evm',
    metadata: { issuer: 'Simulated fiat-referenced stablecoin' },
  },
  {
    id: 'asset-eurc',
    class: 'stablecoin',
    symbol: 'EURC',
    name: 'Euro Coin (simulated balance)',
    currency: 'EUR',
    network: 'sim-evm',
    metadata: { issuer: 'Simulated e-money token' },
  },
  {
    id: 'asset-btc',
    class: 'crypto',
    symbol: 'BTC',
    name: 'Bitcoin (Meridian wallet services, simulated)',
    currency: 'USD',
    network: 'sim-btc',
    metadata: {},
  },
  {
    id: 'asset-eth',
    class: 'crypto',
    symbol: 'ETH',
    name: 'Ether (Meridian wallet services, simulated)',
    currency: 'USD',
    network: 'sim-evm',
    metadata: {},
  },
  {
    id: 'asset-global-equity-fund',
    class: 'fund',
    symbol: 'MGEF',
    name: 'Meridian Global Equity Fund (fictional)',
    currency: 'GBP',
    metadata: {},
  },
  {
    id: 'asset-mmf',
    class: 'fund',
    symbol: 'MMMF',
    name: 'Meridian Money Market Fund (fictional)',
    currency: 'USD',
    metadata: {},
  },
  {
    id: 'asset-alderline-equity',
    class: 'equity',
    symbol: 'ALDR',
    name: 'Alderline PLC ordinary shares (fictional)',
    currency: 'GBP',
    metadata: {},
  },
  {
    id: 'asset-gilt-2031',
    class: 'bond',
    symbol: 'GILT31',
    name: 'UK sovereign bond 2031 (simulated position)',
    currency: 'GBP',
    metadata: {},
  },
  {
    id: 'asset-tokenised-mmf',
    class: 'tokenised',
    symbol: 'tMMF',
    name: 'Tokenised money market fund shares (fictional)',
    currency: 'USD',
    network: 'sim-permissioned',
    metadata: {},
  },
  {
    id: 'asset-tokenised-bond',
    class: 'tokenised',
    symbol: 'tBOND',
    name: 'Tokenised corporate bond 2030 (fictional)',
    currency: 'USD',
    network: 'sim-permissioned',
    metadata: { dsvp: 'true' },
  },
  {
    id: 'asset-tokenised-deposit',
    class: 'tokenised',
    symbol: 'tDEP',
    name: 'Meridian tokenised deposit (fictional)',
    currency: 'USD',
    network: 'sim-permissioned',
    metadata: { dsvp: 'true' },
  },
  {
    id: 'asset-staked-eth',
    class: 'defi',
    symbol: 'stETH',
    name: 'Staked ETH position (simulated, outside custody perimeter)',
    currency: 'USD',
    network: 'sim-evm',
    metadata: { defi: 'staking' },
  },
  {
    id: 'asset-lp-share',
    class: 'defi',
    symbol: 'LP-USDC-ETH',
    name: 'Liquidity pool share USDC/ETH (simulated)',
    currency: 'USD',
    network: 'sim-evm',
    metadata: { defi: 'liquidity-pool' },
  },
]);

export function assetById(id: string): Asset {
  const asset = ASSETS.find((a) => a.id === id);
  if (!asset) throw new Error(`Unknown asset ${id}`);
  return asset;
}

// ---------------------------------------------------------------------------
// DeFi protocol risk labels (PLAN Section 13) — config-driven, keyed by the
// asset's `metadata.defi` kind. Displayed by the opt-in DeFi module alongside
// the "outside Meridian custody perimeter" banner. Simulation only.
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high';

export interface DefiRiskProfile {
  protocol: string;
  perimeter: string;
  risks: ReadonlyArray<{ label: string; level: RiskLevel }>;
}

export const DEFI_RISK_LABELS: Record<string, DefiRiskProfile> = {
  staking: {
    protocol: 'Simulated liquid-staking protocol',
    perimeter: 'Outside Meridian custody — validator/protocol controlled',
    risks: [
      { label: 'Smart-contract risk', level: 'high' },
      { label: 'Slashing / validator risk', level: 'medium' },
      { label: 'Withdrawal / unbonding delay', level: 'medium' },
    ],
  },
  'liquidity-pool': {
    protocol: 'Simulated AMM liquidity pool',
    perimeter: 'Outside Meridian custody — pool contract controlled',
    risks: [
      { label: 'Impermanent loss', level: 'high' },
      { label: 'Smart-contract risk', level: 'high' },
      { label: 'Oracle / price manipulation', level: 'medium' },
    ],
  },
};

export function defiRiskProfile(defiKind: string | undefined): DefiRiskProfile | undefined {
  return defiKind ? DEFI_RISK_LABELS[defiKind] : undefined;
}

// ---------------------------------------------------------------------------
// Entity templates (PLAN Section 6)
// ---------------------------------------------------------------------------

export const EntityTemplateSchema = z.object({
  type: z.string(),
  defaultName: z.string(),
  defaultJurisdiction: z.string(),
  relationships: z.array(z.string()).min(1),
  description: z.string(),
});

export interface EntityTemplate {
  type: EntityType;
  defaultName: string;
  defaultJurisdiction: Jurisdiction;
  relationships: Relationship[];
  description: string;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    type: 'single-family-office',
    defaultName: 'Aldergate Family Office',
    defaultJurisdiction: 'GB',
    relationships: ['custody', 'payments', 'wallet-services', 'fx'],
    description: 'Single-family office with custody, payments, wallet services and FX.',
  },
  {
    type: 'multi-family-office',
    defaultName: 'Cresset & Vane MFO',
    defaultJurisdiction: 'CH',
    relationships: ['custody', 'payments', 'brokerage', 'fx'],
    description: 'Multi-family office managing several household mandates.',
  },
  {
    type: 'corporate-treasury',
    defaultName: 'Bracken Industrial Group Treasury',
    defaultJurisdiction: 'DE',
    relationships: ['payments', 'fx', 'lending', 'wallet-services'],
    description: 'Corporate treasury with cash management, FX and tokenised deposits.',
  },
  {
    type: 'asset-manager',
    defaultName: 'Northgate Asset Management',
    defaultJurisdiction: 'GB',
    relationships: ['custody', 'brokerage', 'fund-administration', 'tokenisation-agent'],
    description: 'Institutional asset manager with tokenisation mandates.',
  },
  {
    type: 'fund',
    defaultName: 'Meridian Alternatives Fund (AIF)',
    defaultJurisdiction: 'SG',
    relationships: ['custody', 'fund-administration'],
    description: 'UCITS/AIF fund vehicle administered by Meridian.',
  },
  {
    type: 'pension-scheme',
    defaultName: 'Ferrous Workers Pension Scheme',
    defaultJurisdiction: 'GB',
    relationships: ['custody', 'fund-administration'],
    description: 'Defined-benefit pension scheme.',
  },
  {
    type: 'hnw-individual',
    defaultName: 'Client: A. Meridian-Smythe',
    defaultJurisdiction: 'CH',
    relationships: ['custody', 'payments', 'wallet-services'],
    description: 'High-net-worth individual client.',
  },
  {
    type: 'fintech-psp',
    defaultName: 'Swiftline Payments Ltd',
    defaultJurisdiction: 'GB',
    relationships: ['payments', 'wallet-services', 'fx'],
    description: 'Fintech payment service provider using Meridian rails.',
  },
  {
    type: 'broker-dealer',
    defaultName: 'Kestrel Securities LLC',
    defaultJurisdiction: 'US',
    relationships: ['custody', 'brokerage', 'fx'],
    description: 'Broker-dealer clearing through Meridian.',
  },
];

export function entityTemplate(type: EntityType): EntityTemplate {
  const t = ENTITY_TEMPLATES.find((e) => e.type === type);
  if (!t) throw new Error(`No entity template for ${type}`);
  return t;
}

// ---------------------------------------------------------------------------
// Persona templates (entitlements per role)
// ---------------------------------------------------------------------------

export interface PersonaTemplate {
  role: PersonaRole;
  defaultDisplayName: string;
  grants: EntitlementGrant[];
  limits?: PersonaLimits;
}

const viewAll = (relationship: Relationship): EntitlementGrant[] =>
  (['cash', 'equity', 'bond', 'fund', 'tokenised', 'stablecoin', 'crypto'] as const).map(
    (assetClass) => ({ relationship, assetClass, level: 'view' as const }),
  );

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    role: 'cio',
    defaultDisplayName: 'Investment Director (CIO)',
    grants: [
      { relationship: 'custody', assetClass: 'cash', level: 'view' },
      { relationship: 'custody', assetClass: 'fund', level: 'view' },
      { relationship: 'custody', assetClass: 'tokenised', level: 'view' },
      { relationship: 'payments', assetClass: 'cash', level: 'approve' },
      { relationship: 'fx', assetClass: 'cash', level: 'initiate' },
      { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'approve' },
      { relationship: 'wallet-services', assetClass: 'crypto', level: 'view' },
    ],
    limits: { perTransaction: 1_000_000, daily: 5_000_000, currency: 'GBP' },
  },
  {
    role: 'treasurer',
    defaultDisplayName: 'Group Treasurer',
    grants: [
      { relationship: 'payments', assetClass: 'cash', level: 'approve' },
      { relationship: 'fx', assetClass: 'cash', level: 'approve' },
      { relationship: 'lending', assetClass: 'cash', level: 'initiate' },
      { relationship: 'wallet-services', assetClass: 'tokenised', level: 'approve' },
      { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'initiate' },
    ],
    limits: { perTransaction: 5_000_000, daily: 20_000_000, currency: 'EUR' },
  },
  {
    role: 'operations-manager',
    defaultDisplayName: 'Operations Manager',
    grants: [
      ...viewAll('custody'),
      { relationship: 'payments', assetClass: 'cash', level: 'initiate' },
    ],
    limits: { perTransaction: 250_000, daily: 1_000_000, currency: 'GBP' },
  },
  {
    role: 'compliance-officer',
    defaultDisplayName: 'Compliance Officer',
    grants: [...viewAll('custody'), ...viewAll('payments'), ...viewAll('wallet-services')],
  },
  {
    role: 'authorised-signatory',
    defaultDisplayName: 'Authorised Signatory',
    grants: [
      { relationship: 'payments', assetClass: 'cash', level: 'approve' },
      { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'approve' },
    ],
    limits: { perTransaction: 2_000_000, daily: 10_000_000, currency: 'GBP' },
  },
  {
    role: 'portfolio-manager',
    defaultDisplayName: 'Portfolio Manager',
    grants: [
      ...viewAll('custody'),
      { relationship: 'brokerage', assetClass: 'equity', level: 'initiate' },
      { relationship: 'brokerage', assetClass: 'bond', level: 'initiate' },
      { relationship: 'tokenisation-agent', assetClass: 'tokenised', level: 'initiate' },
    ],
    limits: { perTransaction: 10_000_000, daily: 50_000_000, currency: 'USD' },
  },
  {
    role: 'family-principal',
    defaultDisplayName: 'Family Principal',
    grants: [...viewAll('custody'), ...viewAll('wallet-services')],
  },
  {
    role: 'external-auditor',
    defaultDisplayName: 'External Auditor',
    // Evidence access is intentionally view-only. Audit history is exposed by
    // the workbench, never through a trust-bearing admin entitlement.
    grants: [...viewAll('custody'), ...viewAll('payments'), ...viewAll('wallet-services')],
  },
];

export interface PersonaJourney {
  role: PersonaRole;
  title: string;
  objective: string;
  scenario: string;
  control: string;
  nextAction: { label: string; to: string };
}

export const PERSONA_JOURNEYS: PersonaJourney[] = [
  {
    role: 'treasurer',
    title: 'Liquidity & rail economics',
    objective: 'Move liquidity while balancing cost, speed, calendars and trapped cash.',
    scenario: 'Compare SWIFT and stablecoin rails for a cross-border supplier payment.',
    control: 'May initiate eligible payments; a separate signatory must approve.',
    nextAction: { label: 'Compare payment rails', to: '/transactions/new/payment' },
  },
  {
    role: 'compliance-officer',
    title: 'Screening & policy review',
    objective: 'Review wallet, sanctions, Travel Rule and policy evidence before release.',
    scenario: 'Investigate a held transfer and trace why each control passed or failed.',
    control: 'Read-only evidence role; cannot initiate or approve value movement.',
    nextAction: { label: 'Review transaction evidence', to: '/transactions' },
  },
  {
    role: 'operations-manager',
    title: 'Exception resolution',
    objective: 'Resolve failed, pending or unmatched settlement without bypassing controls.',
    scenario: 'Trace a delayed payment from instruction through its settlement timeline.',
    control: 'Can initiate within a low operating limit; cannot self-approve.',
    nextAction: { label: 'Inspect settlement timeline', to: '/timeline' },
  },
  {
    role: 'external-auditor',
    title: 'Independent evidence review',
    objective: 'Reconstruct who did what, under which policy, and when.',
    scenario: 'Sample a payment and verify initiation, four-eyes approval and audit integrity.',
    control: 'Strictly view-only with no initiation, approval or administration grants.',
    nextAction: { label: 'Open audit evidence', to: '/audit' },
  },
];

export function personaTemplate(role: PersonaRole): PersonaTemplate {
  const t = PERSONA_TEMPLATES.find((p) => p.role === role);
  if (!t) throw new Error(`No persona template for ${role}`);
  return t;
}

// ---------------------------------------------------------------------------
// Scenario presets
// ---------------------------------------------------------------------------

type Custody = 'meridian' | 'external-custodian' | 'on-chain';

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  entityType: EntityType;
  personaRole: PersonaRole;
  /** [assetRef, quantity, custody, authoritativeSource] */
  portfolio: ReadonlyArray<readonly [string, number, Custody, 'meridian' | 'external']>;
  defaultSeed: number;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'family-office-cio',
    label: 'Family Office CIO (vertical slice)',
    description:
      'Single-family office: cross-border payment UK→CH and USDC transfer with Travel Rule.',
    entityType: 'single-family-office',
    personaRole: 'cio',
    portfolio: [
      ['asset-gbp-cash', 2_500_000, 'meridian', 'meridian'],
      ['asset-chf-cash', 400_000, 'meridian', 'meridian'],
      ['asset-usd-cash', 750_000, 'meridian', 'meridian'],
      ['asset-usdc', 150_000, 'on-chain', 'external'],
      ['asset-global-equity-fund', 85_000, 'meridian', 'meridian'],
      ['asset-tokenised-mmf', 500_000, 'external-custodian', 'external'],
    ],
    defaultSeed: 20260105,
  },
  {
    id: 'corporate-treasury',
    label: 'Corporate Treasury (tokenised deposits)',
    description:
      'Corporate treasury holding tokenised deposits, EURC and multi-currency cash for payments/FX.',
    entityType: 'corporate-treasury',
    personaRole: 'treasurer',
    portfolio: [
      ['asset-eur-cash', 8_000_000, 'meridian', 'meridian'],
      ['asset-usd-cash', 3_000_000, 'meridian', 'meridian'],
      ['asset-gbp-cash', 1_200_000, 'meridian', 'meridian'],
      ['asset-tokenised-deposit', 5_000_000, 'meridian', 'meridian'],
      ['asset-eurc', 250_000, 'on-chain', 'external'],
      ['asset-mmf', 2_000_000, 'meridian', 'meridian'],
    ],
    defaultSeed: 20260212,
  },
  {
    id: 'asset-manager-dsvp',
    label: 'Asset Manager (DvP settlement demo)',
    description:
      'Asset manager settling a tokenised bond against tokenised cash — delivery-versus-payment on a simulated permissioned ledger.',
    entityType: 'asset-manager',
    personaRole: 'portfolio-manager',
    portfolio: [
      ['asset-usd-cash', 4_000_000, 'meridian', 'meridian'],
      ['asset-tokenised-deposit', 6_000_000, 'meridian', 'meridian'],
      ['asset-tokenised-bond', 2_000_000, 'external-custodian', 'external'],
      ['asset-gilt-2031', 3_500_000, 'meridian', 'meridian'],
      ['asset-alderline-equity', 120_000, 'meridian', 'meridian'],
      ['asset-usdc', 90_000, 'on-chain', 'external'],
    ],
    defaultSeed: 20260319,
  },
];

export function scenarioPreset(id: string): ScenarioPreset {
  const p = SCENARIO_PRESETS.find((s) => s.id === id);
  if (!p) throw new Error(`Unknown scenario preset ${id}`);
  return p;
}

export const DEFAULT_SEED = 20260105;

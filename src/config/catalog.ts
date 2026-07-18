import { AssetSchema, type Asset, type EntitlementGrant, type PersonaLimits } from '@/schemas';
import { z } from 'zod';

/**
 * Configuration-driven catalogue (PLAN Section 32). M2 ships the vertical
 * slice content (Family Office CIO); the full entity/persona/asset catalogue
 * lands in M3. All entries are Zod-validated at load time.
 */

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
    id: 'asset-usdc',
    class: 'stablecoin',
    symbol: 'USDC',
    name: 'USD Coin (simulated balance)',
    currency: 'USD',
    network: 'sim-evm',
    metadata: { issuer: 'Simulated fiat-referenced stablecoin' },
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
    id: 'asset-tokenised-mmf',
    class: 'tokenised',
    symbol: 'tMMF',
    name: 'Tokenised money market fund shares (fictional)',
    currency: 'USD',
    network: 'sim-permissioned',
    metadata: {},
  },
]);

export function assetById(id: string): Asset {
  const asset = ASSETS.find((a) => a.id === id);
  if (!asset) throw new Error(`Unknown asset ${id}`);
  return asset;
}

export const FAMILY_OFFICE_TEMPLATE = {
  name: 'Aldergate Family Office',
  type: 'single-family-office' as const,
  jurisdiction: 'GB' as const,
  relationships: ['custody', 'payments', 'wallet-services', 'fx'] as const,
};

export const CIO_GRANTS: EntitlementGrant[] = [
  { relationship: 'custody', assetClass: 'cash', level: 'view' },
  { relationship: 'custody', assetClass: 'fund', level: 'view' },
  { relationship: 'custody', assetClass: 'tokenised', level: 'view' },
  { relationship: 'payments', assetClass: 'cash', level: 'approve' },
  { relationship: 'fx', assetClass: 'cash', level: 'initiate' },
  { relationship: 'wallet-services', assetClass: 'stablecoin', level: 'approve' },
  { relationship: 'wallet-services', assetClass: 'crypto', level: 'view' },
];

export const CIO_LIMITS: PersonaLimits = {
  perTransaction: 1_000_000,
  daily: 5_000_000,
  currency: 'GBP',
};

/** Deterministic slice portfolio: [assetRef, quantity, custody, source]. */
export const SLICE_PORTFOLIO = [
  ['asset-gbp-cash', 2_500_000, 'meridian', 'meridian'],
  ['asset-chf-cash', 400_000, 'meridian', 'meridian'],
  ['asset-usd-cash', 750_000, 'meridian', 'meridian'],
  ['asset-usdc', 150_000, 'on-chain', 'external'],
  ['asset-global-equity-fund', 85_000, 'meridian', 'meridian'],
  ['asset-tokenised-mmf', 500_000, 'external-custodian', 'external'],
] as const;

export const DEFAULT_SEED = 20260105;

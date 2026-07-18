import { Link } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { assetById, defiRiskProfile, type RiskLevel } from '@/config/catalog';
import type { Persona } from '@/schemas';

function gbp(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

const RISK_TONE: Record<RiskLevel, 'accent' | 'warning' | 'neutral'> = {
  high: 'accent',
  medium: 'warning',
  low: 'neutral',
};

/** DeFi positions are visible only with an explicit `defi` view entitlement. */
function isDefiEntitled(persona: Persona | undefined): boolean {
  return Boolean(persona?.grants.some((grant) => grant.assetClass === 'defi'));
}

function DefiView() {
  const session = useSessionStore((s) => s.session)!;
  const activePersona = session.personas.find((p) => p.id === session.activePersonaId);

  if (!session.settings.defiEnabled) {
    return (
      <Card title="DeFi module is disabled">
        <p className="text-sm text-ink-soft" data-testid="defi-disabled">
          DeFi is off by default (PLAN Section 13). Enable the opt-in in the setup wizard to
          simulate staking and liquidity-pool positions held outside the Meridian custody perimeter.
        </p>
        <div className="mt-3 text-sm">
          <Link className="text-accent underline" to="/wizard/step/1">
            Re-run the wizard with DeFi enabled
          </Link>
        </div>
      </Card>
    );
  }

  if (!isDefiEntitled(activePersona)) {
    return (
      <Card title="Not entitled to DeFi positions">
        <p className="text-sm text-ink-soft" data-testid="defi-not-entitled">
          {activePersona?.displayName ?? 'The active persona'} does not hold a DeFi view
          entitlement. Switch to an entitled persona to view these positions.
        </p>
      </Card>
    );
  }

  const defiHoldings = session.holdings
    .map((h) => ({ holding: h, asset: assetById(h.assetRef) }))
    .filter((r) => r.asset.class === 'defi');
  const total = defiHoldings.reduce((sum, r) => sum + r.holding.valuation.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">DeFi positions</h1>
        <span className="text-sm text-ink-soft" data-testid="defi-total">
          {gbp(total)} · {defiHoldings.length} position(s)
        </span>
      </div>

      <div
        className="rounded-lg border border-accent bg-panel p-4 text-sm text-accent"
        role="note"
        data-testid="defi-perimeter-banner"
      >
        <strong>Outside Meridian custody perimeter.</strong> These simulated positions are held on
        external protocols, not under Meridian regulated custody. Meridian provides orchestration and
        reconciliation only. No wallet is connected, no key is held, and no transaction is signed —
        ever (simulation).
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {defiHoldings.map(({ holding, asset }) => {
          const profile = defiRiskProfile(asset.metadata.defi);
          return (
            <Card key={holding.id} title={asset.name} data-testid="defi-position">
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-soft">Symbol</dt>
                <dd className="font-mono text-xs">{asset.symbol}</dd>
                <dt className="text-ink-soft">Value</dt>
                <dd>{gbp(holding.valuation.value)}</dd>
                <dt className="text-ink-soft">Network</dt>
                <dd>{holding.network ?? asset.network ?? '—'}</dd>
                <dt className="text-ink-soft">Custody</dt>
                <dd>{holding.custodyLocation}</dd>
              </dl>
              {profile && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-xs text-ink-soft">{profile.protocol}</p>
                  <p className="mb-2 text-xs text-ink-soft">{profile.perimeter}</p>
                  <div className="flex flex-wrap gap-2" data-testid="defi-risks">
                    {profile.risks.map((risk) => (
                      <Badge key={risk.label} tone={RISK_TONE[risk.level]}>
                        {risk.label}: {risk.level}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function DefiPage() {
  return (
    <SessionGuard>
      <DefiView />
    </SessionGuard>
  );
}

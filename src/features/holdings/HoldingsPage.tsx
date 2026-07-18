import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { assetById } from '@/config/catalog';
import type { AssetClass } from '@/schemas';

const CLASS_LABELS: Partial<Record<AssetClass, string>> = {
  cash: 'Cash',
  fund: 'Funds',
  tokenised: 'Tokenised',
  stablecoin: 'Stablecoins',
  crypto: 'Crypto',
};

function gbp(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

function HoldingsView() {
  const session = useSessionStore((s) => s.session)!;
  const [classFilter, setClassFilter] = useState<AssetClass | 'all'>('all');
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const filtered = session.holdings
      .map((h) => ({ holding: h, asset: assetById(h.assetRef) }))
      .filter((r) => classFilter === 'all' || r.asset.class === classFilter);
    return filtered.sort((a, b) =>
      sortDesc
        ? b.holding.valuation.value - a.holding.valuation.value
        : a.holding.valuation.value - b.holding.valuation.value,
    );
  }, [session.holdings, classFilter, sortDesc]);

  const total = session.holdings.reduce((sum, h) => sum + h.valuation.value, 0);
  const byClass = session.holdings.reduce<Record<string, number>>((acc, h) => {
    const cls = assetById(h.assetRef).class;
    acc[cls] = (acc[cls] ?? 0) + h.valuation.value;
    return acc;
  }, {});
  const byCustody = session.holdings.reduce<Record<string, number>>((acc, h) => {
    acc[h.custodyLocation] = (acc[h.custodyLocation] ?? 0) + h.valuation.value;
    return acc;
  }, {});

  const presentClasses = Object.keys(byClass) as AssetClass[];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Holdings</h1>
        <span className="text-sm text-ink-soft">
          {session.entities[0]?.name} · valuations as of {session.holdings[0]?.valuation.asOf}{' '}
          (UTC, deterministic)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Total value">
          <p className="text-2xl font-semibold" data-testid="total-value">
            {gbp(total)}
          </p>
        </Card>
        <Card title="By asset class">
          <ul className="space-y-1 text-sm">
            {Object.entries(byClass).map(([cls, v]) => (
              <li key={cls} className="flex justify-between">
                <span>{CLASS_LABELS[cls as AssetClass] ?? cls}</span>
                <span className="font-medium">{gbp(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="By custody location">
          <ul className="space-y-1 text-sm">
            {Object.entries(byCustody).map(([loc, v]) => (
              <li key={loc} className="flex justify-between">
                <span>{loc}</span>
                <span className="font-medium">{gbp(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Positions"
        actions={
          <button
            type="button"
            className="text-sm text-accent underline"
            onClick={() => setSortDesc((v) => !v)}
          >
            Sort by value {sortDesc ? '▼' : '▲'}
          </button>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Chip selected={classFilter === 'all'} onClick={() => setClassFilter('all')}>
            All
          </Chip>
          {presentClasses.map((cls) => (
            <Chip key={cls} selected={classFilter === cls} onClick={() => setClassFilter(cls)}>
              {CLASS_LABELS[cls] ?? cls}
            </Chip>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4">Class</th>
                <th className="py-2 pr-4 text-right">Quantity</th>
                <th className="py-2 pr-4 text-right">Value (GBP)</th>
                <th className="py-2 pr-4">Custody</th>
                <th className="py-2 pr-4">Network</th>
                <th className="py-2">Source of truth</th>
              </tr>
            </thead>
            <tbody data-testid="holdings-table">
              {rows.map(({ holding, asset }) => (
                <tr key={holding.id} className="border-b border-line/60">
                  <td className="py-2 pr-4 font-medium">
                    {asset.name}
                    <span className="ml-1 text-ink-soft">({asset.symbol})</span>
                  </td>
                  <td className="py-2 pr-4">{CLASS_LABELS[asset.class] ?? asset.class}</td>
                  <td className="py-2 pr-4 text-right">
                    {new Intl.NumberFormat('en-GB').format(holding.quantity)}
                  </td>
                  <td className="py-2 pr-4 text-right">{gbp(holding.valuation.value)}</td>
                  <td className="py-2 pr-4">{holding.custodyLocation}</td>
                  <td className="py-2 pr-4">{holding.network ?? '—'}</td>
                  <td className="py-2">
                    {holding.authoritativeSource === 'meridian' ? (
                      <Badge tone="accent">Meridian-authoritative</Badge>
                    ) : (
                      <Badge tone="neutral">External, reconciled</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function HoldingsPage() {
  return (
    <SessionGuard>
      <HoldingsView />
    </SessionGuard>
  );
}

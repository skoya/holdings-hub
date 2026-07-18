import { Link } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { assetById } from '@/config/catalog';
import { stateTone } from '@/features/transactions/TransactionsPage';
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

/**
 * Mobile companion (PLAN Sections 28 / 44): a simplified, single-column view
 * scoped to a holdings summary plus payment initiation and approval only. It
 * reuses the same store and mutation paths as the desktop routes — no separate
 * data layer — so the four-eyes control and audit trail behave identically.
 */
function MobileView() {
  const session = useSessionStore((s) => s.session)!;
  const switchPersona = useSessionStore((s) => s.switchPersona);
  const approveTransaction = useSessionStore((s) => s.approveTransaction);
  const lastError = useSessionStore((s) => s.lastError);

  const total = session.holdings.reduce((sum, h) => sum + h.valuation.value, 0);
  const byClass = session.holdings.reduce<Record<string, number>>((acc, h) => {
    const cls = assetById(h.assetRef).class;
    acc[cls] = (acc[cls] ?? 0) + h.valuation.value;
    return acc;
  }, {});
  const pending = session.transactions.filter((t) => t.state === 'pending-approval');

  return (
    <div className="mx-auto max-w-md space-y-4" data-testid="mobile-companion">
      <div>
        <h1 className="text-xl font-semibold">Mobile companion</h1>
        <p className="text-sm text-ink-soft">
          {session.entities[0]?.name} · holdings summary and payments
        </p>
      </div>

      {lastError && (
        <div
          className="rounded-lg border border-accent bg-panel p-3 text-sm text-accent"
          role="alert"
          data-testid="mobile-error"
        >
          {lastError}
        </div>
      )}

      <Card title="Total portfolio value">
        <p className="text-3xl font-semibold" data-testid="mobile-total">
          {gbp(total)}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(byClass).map(([cls, v]) => (
            <li key={cls} className="flex justify-between">
              <span>{CLASS_LABELS[cls as AssetClass] ?? cls}</span>
              <span className="font-medium">{gbp(v)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Initiate payment">
        <div className="flex flex-col gap-2">
          <Link
            to="/transactions/new/payment"
            data-testid="mobile-new-payment"
            className="inline-flex w-full items-center justify-center rounded bg-dark px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-dark-2"
          >
            New cross-border payment
          </Link>
          <Link
            to="/transactions/new/usdc"
            data-testid="mobile-new-usdc"
            className="inline-flex w-full items-center justify-center rounded border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-bg"
          >
            New USDC transfer
          </Link>
        </div>
      </Card>

      <Card title="Awaiting approval">
        {pending.length === 0 ? (
          <p className="text-sm text-ink-soft">No payments awaiting approval.</p>
        ) : (
          <ul className="space-y-3" data-testid="mobile-approvals">
            {pending.map((tx) => (
              <li key={tx.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{tx.reference}</span>
                  <Badge tone={stateTone(tx.state)}>{tx.state}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {new Intl.NumberFormat('en-GB').format(tx.amount)} {tx.currency} →{' '}
                  {tx.beneficiary.name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-ink-soft" htmlFor={`approver-${tx.id}`}>
                    Approve as
                  </label>
                  <select
                    id={`approver-${tx.id}`}
                    aria-label="Approving persona"
                    className="rounded border border-line bg-panel px-2 py-1.5 text-sm"
                    value={session.activePersonaId ?? ''}
                    onChange={(event) => switchPersona(event.target.value)}
                    data-testid="mobile-approval-persona"
                  >
                    {session.personas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.displayName} · {persona.role}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => approveTransaction(tx.id)}
                    data-testid="mobile-approve"
                  >
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent payments">
        {session.transactions.length === 0 ? (
          <p className="text-sm text-ink-soft">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="mobile-transactions">
            {session.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2 py-2">
                <Link to={`/transactions/${tx.id}`} className="text-sm text-accent underline">
                  {tx.reference}
                </Link>
                <Badge tone={stateTone(tx.state)}>{tx.state}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function MobilePage() {
  return (
    <SessionGuard>
      <MobileView />
    </SessionGuard>
  );
}

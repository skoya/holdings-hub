import { Link } from 'react-router-dom';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useSessionStore } from '@/stores/sessionStore';

export function HomePage() {
  const session = useSessionStore((s) => s.session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Client Holdings Hub</h1>
        <p className="mt-1 text-ink-soft">
          A simulation of how a global bank can act as the orchestration and trust hub across
          traditional finance, regulated digital assets and tokenised finance.
        </p>
      </div>

      {session ? (
        <Card title="Active session">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">Session</dt>
            <dd>{session.name}</dd>
            <dt className="text-ink-soft">Entity</dt>
            <dd>
              {session.entities[0]?.name} ({session.entities[0]?.jurisdiction})
            </dd>
            <dt className="text-ink-soft">Sim clock</dt>
            <dd className="font-mono text-xs">{session.clock.currentTs} UTC</dd>
            <dt className="text-ink-soft">Transactions</dt>
            <dd>{session.transactions.length}</dd>
          </dl>
          <div className="mt-3 flex gap-3 text-sm">
            <Link to="/holdings" className="text-accent underline">
              Holdings
            </Link>
            <Link to="/transactions" className="text-accent underline">
              Transactions
            </Link>
            <Link to="/timeline" className="text-accent underline">
              Timeline
            </Link>
          </div>
        </Card>
      ) : (
        <Card title="Get started">
          <p className="text-sm text-ink-soft">
            Create a simulation session with the setup wizard — the M2 vertical slice models a
            family office CIO making a cross-border payment and a USDC transfer.
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <Link to="/wizard/step/1" className="text-accent underline" data-testid="start-wizard">
              Start the wizard
            </Link>
            <Link to="/library" className="text-accent underline">
              Load from library
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Unified holdings">
          <p className="text-sm text-ink-soft">
            Cash, funds, tokenised assets and stablecoins in one view — each record labelled with
            its authoritative source.
          </p>
          <Badge tone="neutral" className="mt-3">
            <Link to="/holdings">Open holdings</Link>
          </Badge>
        </Card>
        <Card title="Routing & orchestration">
          <p className="text-sm text-ink-soft">
            Cross-border payment routed via SWIFT correspondent chain or a 24/7 stablecoin rail —
            with cost, speed and calendar trade-offs made explicit.
          </p>
          <Badge tone="neutral" className="mt-3">
            <Link to="/transactions/new/payment">Initiate a payment</Link>
          </Badge>
        </Card>
        <Card title="Controls & audit">
          <p className="text-sm text-ink-soft">
            Screening, Travel Rule packets and an append-only audit trail — deterministic for a
            given seed and action script.
          </p>
          <Badge tone="neutral" className="mt-3">
            <Link to="/audit">Open audit trail</Link>
          </Badge>
        </Card>
      </div>
    </div>
  );
}

import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

/**
 * Placeholder dashboard for M1. Replaced by the entitlement-filtered holdings
 * dashboard in M2 (vertical slice: Family Office CIO).
 */
export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Client Holdings Hub</h1>
        <p className="mt-1 text-ink-soft">
          A simulation of how a global bank can act as the orchestration and trust hub across
          traditional finance, regulated digital assets and tokenised finance.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Setup wizard">
          <p className="text-sm text-ink-soft">
            Create a simulation session: choose an entity, its relationships with Meridian, and a
            persona.
          </p>
          <Badge tone="neutral" className="mt-3">
            Arrives in Milestone 2
          </Badge>
        </Card>
        <Card title="Holdings">
          <p className="text-sm text-ink-soft">
            Unified view across cash, securities, tokenised assets and digital assets — with
            source-of-truth labelling per record.
          </p>
          <Badge tone="neutral" className="mt-3">
            Arrives in Milestone 2
          </Badge>
        </Card>
        <Card title="Transactions & routing">
          <p className="text-sm text-ink-soft">
            Simulated payments and transfers with route recommendations across fiat and stablecoin
            rails.
          </p>
          <Badge tone="neutral" className="mt-3">
            Arrives in Milestone 2
          </Badge>
        </Card>
      </div>
      <Card title="Foundation status">
        <ul className="list-inside list-disc text-sm text-ink-soft">
          <li>Deterministic simulation engine (seeded, serialisable) — live</li>
          <li>Core data schemas with runtime validation — live</li>
          <li>Browser-local session persistence with migrations — live</li>
          <li>
            Design system — see the <a href="#/styleguide" className="text-accent underline">styleguide</a>
          </li>
        </ul>
      </Card>
    </div>
  );
}

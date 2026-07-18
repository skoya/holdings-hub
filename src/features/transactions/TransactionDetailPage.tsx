import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { stateTone } from './TransactionsPage';

const LifecycleDiagram = lazy(() =>
  import('@/features/diagrams/LifecycleDiagram').then((m) => ({ default: m.LifecycleDiagram })),
);

function TransactionDetailView() {
  const { txId } = useParams();
  const session = useSessionStore((s) => s.session)!;
  const validateTransaction = useSessionStore((s) => s.validateTransaction);
  const approveTransaction = useSessionStore((s) => s.approveTransaction);
  const selectRoute = useSessionStore((s) => s.selectRoute);
  const runSettlement = useSessionStore((s) => s.runSettlement);

  const tx = session.transactions.find((t) => t.id === txId);
  if (!tx) {
    return <p className="text-sm text-ink-soft">Transaction not found in the active session.</p>;
  }

  const auditForTx = session.auditLog.filter((e) => e.objectRef === `tx:${tx.id}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {tx.reference} <Badge tone={stateTone(tx.state)}>{tx.state}</Badge>
        </h1>
        <span className="text-sm text-ink-soft">
          {tx.type} · {new Intl.NumberFormat('en-GB').format(tx.amount)} {tx.currency}
        </span>
      </div>

      <Card title="Next action">
        <div className="flex flex-wrap gap-3">
          {tx.state === 'draft' && (
            <Button onClick={() => validateTransaction(tx.id)} data-testid="btn-validate">
              Validate & screen
            </Button>
          )}
          {tx.state === 'pending-approval' && (
            <Button onClick={() => approveTransaction(tx.id)} data-testid="btn-approve">
              Approve
            </Button>
          )}
          {tx.state === 'approved' &&
            tx.route?.options.map((o) => (
              <Button
                key={o.id}
                variant={o.rail === 'stablecoin' ? 'primary' : 'secondary'}
                onClick={() => selectRoute(tx.id, o.id)}
                data-testid={`btn-route-${o.rail}`}
              >
                Dispatch via {o.label}
              </Button>
            ))}
          {tx.state === 'routing' && (
            <Button onClick={() => runSettlement(tx.id)} data-testid="btn-settle">
              Run settlement
            </Button>
          )}
          {(tx.state === 'settled' || tx.state === 'failed' || tx.state === 'returned') && (
            <p className="text-sm text-ink-soft">Terminal state — no further actions.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Parties">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">Originator</dt>
            <dd>
              {tx.originator.name} · {tx.originator.institution} ({tx.originator.jurisdiction})
              <div className="font-mono text-xs text-ink-soft">{tx.originator.account}</div>
            </dd>
            <dt className="text-ink-soft">Beneficiary</dt>
            <dd>
              {tx.beneficiary.name} · {tx.beneficiary.institution} ({tx.beneficiary.jurisdiction})
              <div className="font-mono text-xs text-ink-soft">{tx.beneficiary.account}</div>
            </dd>
          </dl>
        </Card>

        <Card title="Screening (simulated)">
          {tx.screening ? (
            <div className="text-sm">
              <Badge
                tone={
                  tx.screening.outcome === 'clear'
                    ? 'success'
                    : tx.screening.outcome === 'review'
                      ? 'warning'
                      : 'accent'
                }
              >
                {tx.screening.outcome}
              </Badge>
              <p className="mt-2 text-ink-soft">{tx.screening.note}</p>
              <p className="mt-1 text-xs text-ink-soft">
                Checked at {tx.screening.checkedAt} (UTC)
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Runs during validation.</p>
          )}
        </Card>
      </div>

      {tx.route && (
        <Card title="Route comparison">
          <p className="mb-3 text-sm text-ink-soft">
            Snapshot generated {tx.route.generatedAt} (UTC); the selection and this comparison are
            recorded in the audit trail.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="route-comparison">
              <thead>
                <tr className="border-b border-line text-ink-soft">
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4 text-right">Cost (bps)</th>
                  <th className="py-2 pr-4 text-right">Flat fee</th>
                  <th className="py-2 pr-4 text-right">FX spread (bps)</th>
                  <th className="py-2 pr-4 text-right">ETA</th>
                  <th className="py-2 pr-4">Settlement (UTC)</th>
                  <th className="py-2 pr-4">Cut-off / calendar</th>
                  <th className="py-2">Controls</th>
                </tr>
              </thead>
              <tbody>
                {tx.route.options.map((o) => (
                  <tr
                    key={o.id}
                    className={`border-b border-line/60 ${
                      tx.route?.selectedRouteId === o.id ? 'bg-bg' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {o.label}
                      {tx.route?.selectedRouteId === o.id && (
                        <Badge tone="accent" className="ml-2">
                          selected
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right">{o.costBps}</td>
                    <td className="py-2 pr-4 text-right">{o.feeFlat}</td>
                    <td className="py-2 pr-4 text-right">{o.fxSpreadBps}</td>
                    <td className="py-2 pr-4 text-right">
                      {o.etaMinutes >= 60
                        ? `${Math.round(o.etaMinutes / 60)} h`
                        : `${o.etaMinutes} min`}
                    </td>
                    <td className="py-2 pr-4">{o.settlementDate}</td>
                    <td className="py-2 pr-4">{o.cutoffNote}</td>
                    <td className="py-2">{o.controls.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tx.travelRule && (
        <Card title="Travel Rule packet (simulated)">
          <div className="mb-2 text-sm">
            <Badge tone={tx.travelRule.required ? 'warning' : 'neutral'}>
              {tx.travelRule.required
                ? `Required — ≥ ${tx.travelRule.thresholdAmount} ${tx.travelRule.thresholdCcy}`
                : 'Below threshold'}
            </Badge>
          </div>
          <pre
            className="max-h-64 overflow-auto rounded bg-bg p-3 font-mono text-xs"
            data-testid="travel-rule-packet"
          >
            {JSON.stringify(tx.travelRule, null, 2)}
          </pre>
        </Card>
      )}

      <Card title="Lifecycle">
        <Suspense fallback={<p className="text-sm text-ink-soft">Loading diagram…</p>}>
          <LifecycleDiagram currentState={tx.state} events={tx.events} />
        </Suspense>
        <ol className="mt-4 space-y-1 text-sm" data-testid="lifecycle-events">
          {tx.events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-44 font-mono text-xs text-ink-soft">{e.ts}</span>
              <Badge tone={stateTone(e.state)}>{e.state}</Badge>
              {e.note && <span className="text-ink-soft">{e.note}</span>}
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Audit events for this transaction">
        <ul className="space-y-1 text-sm">
          {auditForTx.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-44 font-mono text-xs text-ink-soft">{e.ts}</span>
              <span className="font-medium">{e.action}</span>
              {e.rationale && <span className="text-ink-soft">{e.rationale}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function TransactionDetailPage() {
  return (
    <SessionGuard>
      <TransactionDetailView />
    </SessionGuard>
  );
}

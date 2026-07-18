import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { Link } from 'react-router-dom';

/**
 * UTC session timeline (PLAN Section 16): audit events in simulated-clock
 * order with category filters; every item links to its object where possible.
 */
function TimelineView() {
  const session = useSessionStore((s) => s.session)!;
  const [filter, setFilter] = useState<'all' | 'transaction' | 'screening' | 'session'>('all');

  const items = useMemo(() => {
    return session.auditLog
      .filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'transaction') return e.action.startsWith('transaction.') || e.action.startsWith('route.');
        if (filter === 'screening') return e.action.startsWith('screening.');
        return e.action.startsWith('session.') || e.action.startsWith('holdings.');
      })
      .slice()
      .sort((a, b) => a.ts.localeCompare(b.ts));
  }, [session.auditLog, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Timeline</h1>
        <span className="text-sm text-ink-soft">All timestamps UTC (simulation clock)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['all', 'transaction', 'screening', 'session'] as const).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>
      <Card>
        <ol className="relative space-y-4 border-l border-line pl-6" data-testid="timeline">
          {items.map((e) => {
            const txRef = e.objectRef.startsWith('tx:') ? e.objectRef.slice(3) : null;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full border-2 border-panel bg-dark" />
                <div className="font-mono text-xs text-ink-soft">{e.ts} UTC</div>
                <div className="text-sm">
                  <span className="font-medium">{e.action}</span>{' '}
                  {txRef ? (
                    <Link to={`/transactions/${txRef}`} className="text-accent underline">
                      {e.objectRef}
                    </Link>
                  ) : (
                    <span className="text-ink-soft">{e.objectRef}</span>
                  )}
                </div>
                {e.rationale && <div className="text-sm text-ink-soft">{e.rationale}</div>}
              </li>
            );
          })}
          {items.length === 0 && <p className="text-sm text-ink-soft">No events for this filter.</p>}
        </ol>
      </Card>
      <Badge tone="neutral">
        {session.auditLog.length} audit events · deterministic for seed {session.seed}
      </Badge>
    </div>
  );
}

export function TimelinePage() {
  return (
    <SessionGuard>
      <TimelineView />
    </SessionGuard>
  );
}

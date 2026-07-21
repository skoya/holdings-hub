import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';
import { useUiStore } from '@/stores/uiStore';
import { Link } from 'react-router-dom';

/**
 * UTC session timeline (PLAN Section 16): audit events in simulated-clock
 * order with category filters; every item links to its object where possible.
 *
 * The time scrubber at the top sets the shared timeCursor in uiStore. Events
 * after the cursor are dimmed, and the Graph page reflects the same moment.
 */
export function TimelineView() {
  const session = useSessionStore((s) => s.session)!;
  const { timeCursor, setTimeCursor } = useUiStore();
  const [filter, setFilter] = useState<'all' | 'transaction' | 'screening' | 'persona' | 'session'>(
    'all',
  );

  // Full audit log sorted by timestamp — the scrubber indexes into this.
  const allSorted = useMemo(
    () => [...session.auditLog].sort((a, b) => a.ts.localeCompare(b.ts)),
    [session.auditLog],
  );

  // Compute the slider index from the stored cursor.
  const sliderIndex = useMemo(() => {
    if (timeCursor === null) return allSorted.length - 1;
    const firstAfter = allSorted.findIndex((e) => e.ts > timeCursor);
    return firstAfter === -1 ? allSorted.length - 1 : Math.max(0, firstAfter - 1);
  }, [timeCursor, allSorted]);

  const isLive = timeCursor === null;

  const items = useMemo(() => {
    return session.auditLog
      .filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'transaction')
          return e.action.startsWith('transaction.') || e.action.startsWith('route.');
        if (filter === 'screening') return e.action.startsWith('screening.');
        if (filter === 'persona') return e.action.startsWith('persona.');
        return (
          e.action.startsWith('session.') ||
          e.action.startsWith('holdings.') ||
          e.action.startsWith('persona.')
        );
      })
      .slice()
      .sort((a, b) => a.ts.localeCompare(b.ts));
  }, [session.auditLog, filter]);

  const firstTs = allSorted[0]?.ts ?? '';
  const lastTs = allSorted[allSorted.length - 1]?.ts ?? '';
  const cursorTs = allSorted[sliderIndex]?.ts ?? lastTs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Timeline</h1>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge tone="neutral">Live · all events visible</Badge>
          ) : (
            <>
              <span className="font-mono text-xs text-ink-soft">Replaying at {cursorTs} UTC</span>
              <button
                onClick={() => setTimeCursor(null)}
                className="rounded px-2 py-0.5 text-xs text-accent underline hover:no-underline"
              >
                Return to live
              </button>
            </>
          )}
          <span className="text-sm text-ink-soft">UTC (simulation clock)</span>
        </div>
      </div>

      {/* Time scrubber */}
      {allSorted.length > 1 && (
        <div className="rounded-lg border border-line bg-panel px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
            <span className="font-mono">{firstTs}</span>
            <span className="font-semibold text-ink">
              {isLive ? 'Live' : `Event ${sliderIndex + 1} / ${allSorted.length}`}
            </span>
            <span className="font-mono">{lastTs}</span>
          </div>
          <input
            type="range"
            min={0}
            max={allSorted.length - 1}
            value={sliderIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (idx >= allSorted.length - 1) {
                setTimeCursor(null);
              } else {
                setTimeCursor(allSorted[idx].ts);
              }
            }}
            className="w-full accent-accent"
            aria-label="Simulation time cursor"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Drag to replay history — the Graph page reflects the same moment.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'transaction', 'screening', 'persona', 'session'] as const).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      <Card>
        <ol className="relative space-y-4 border-l border-line pl-6" data-testid="timeline">
          {items.map((e) => {
            const inPast = isLive || e.ts <= cursorTs;
            const txRef = e.objectRef.startsWith('tx:') ? e.objectRef.slice(3) : null;
            return (
              <li
                key={e.id}
                className={`relative transition-opacity ${inPast ? '' : 'opacity-30'}`}
              >
                <span
                  className={`absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full border-2 border-panel ${
                    inPast ? 'bg-dark' : 'bg-line'
                  }`}
                />
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
          {items.length === 0 && (
            <p className="text-sm text-ink-soft">No events for this filter.</p>
          )}
        </ol>
      </Card>

      <Badge tone="neutral">
        {isLive
          ? `${session.auditLog.length} audit events · deterministic for seed ${session.seed}`
          : `${items.filter((e) => e.ts <= cursorTs).length} of ${items.length} events visible · seed ${session.seed}`}
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

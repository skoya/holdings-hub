import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { SCHEMA_VERSION } from '@/schemas';
import { hashObject } from '@/engine/hash';

function debugEnabled(search: string): boolean {
  if (new URLSearchParams(search).get('debug') === '1') return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('hh:debug') === '1';
  } catch {
    return false;
  }
}

/**
 * Developer diagnostics panel (PLAN M1 deliverable 9). Feature-flagged via
 * `?debug=1` (hash-route query) or `localStorage['hh:debug'] = '1'`.
 */
export function DiagnosticsPanel() {
  const location = useLocation();
  const session = useSessionStore((s) => s.session);
  const enabled = debugEnabled(location.search);

  const stateHash = useMemo(
    () => (session ? hashObject(session.engineState) : '—'),
    [session],
  );

  if (!enabled) return null;

  const snapshot = session
    ? {
        id: session.id,
        seed: session.seed,
        clock: session.clock,
        engineState: session.engineState,
        counts: {
          entities: session.entities.length,
          personas: session.personas.length,
          holdings: session.holdings.length,
          transactions: session.transactions.length,
          auditEvents: session.auditLog.length,
        },
      }
    : null;

  return (
    <aside
      aria-label="Developer diagnostics"
      data-testid="diagnostics-panel"
      className="border-t border-line bg-dark-2 px-4 py-3 font-mono text-xs text-white"
    >
      <h2 className="mb-1 font-semibold uppercase tracking-wide text-white/70">Diagnostics</h2>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
        <dt className="text-white/60">Seed</dt>
        <dd>{session?.seed ?? 'no session'}</dd>
        <dt className="text-white/60">Schema version</dt>
        <dd>v{SCHEMA_VERSION}</dd>
        <dt className="text-white/60">Sim clock (UTC)</dt>
        <dd>{session?.clock.currentTs ?? '—'}</dd>
        <dt className="text-white/60">Engine state hash</dt>
        <dd data-testid="engine-hash">{stateHash}</dd>
      </dl>
      {snapshot && (
        <details className="mt-2">
          <summary className="cursor-pointer text-white/70">Store snapshot</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-dark p-2">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </details>
      )}
    </aside>
  );
}

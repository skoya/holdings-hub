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
  const seed = useSessionStore((s) => s.seed);
  const engineState = useSessionStore((s) => s.engineState);
  const enabled = debugEnabled(location.search);

  const stateHash = useMemo(() => hashObject(engineState), [engineState]);

  if (!enabled) return null;

  return (
    <aside
      aria-label="Developer diagnostics"
      data-testid="diagnostics-panel"
      className="border-t border-line bg-dark-2 px-4 py-3 font-mono text-xs text-white"
    >
      <h2 className="mb-1 font-semibold uppercase tracking-wide text-white/70">Diagnostics</h2>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
        <dt className="text-white/60">Seed</dt>
        <dd>{seed}</dd>
        <dt className="text-white/60">Schema version</dt>
        <dd>v{SCHEMA_VERSION}</dd>
        <dt className="text-white/60">Engine state hash</dt>
        <dd>{stateHash}</dd>
      </dl>
      <details className="mt-2">
        <summary className="cursor-pointer text-white/70">Store snapshot</summary>
        <pre className="mt-1 max-h-64 overflow-auto rounded bg-dark p-2">
          {JSON.stringify({ seed, engineState }, null, 2)}
        </pre>
      </details>
    </aside>
  );
}

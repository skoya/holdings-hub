import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SessionGuard } from '@/features/common/SessionGuard';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Append-only audit trail view (PLAN Section 17): filterable, exportable.
 * CSV joins the ZIP bundle export in M6.
 */
function AuditView() {
  const session = useSessionStore((s) => s.session)!;
  const [query, setQuery] = useState('');

  const rows = session.auditLog.filter(
    (e) =>
      !query ||
      e.action.includes(query) ||
      e.objectRef.includes(query) ||
      (e.rationale ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(session.auditLog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.id}-audit.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit trail</h1>
        <Button variant="secondary" onClick={exportJson}>
          Export JSON
        </Button>
      </div>
      <Card>
        <label className="mb-2 block text-sm font-medium" htmlFor="audit-filter">
          Filter (action, object, rationale)
        </label>
        <input
          id="audit-filter"
          className="mb-4 w-full rounded border border-line bg-panel px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. transaction.settled"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="audit-table">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4">Timestamp (UTC)</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Object</th>
                <th className="py-2 pr-4">Snapshot hash</th>
                <th className="py-2">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-4 font-mono text-xs">{e.ts}</td>
                  <td className="py-2 pr-4">{e.actorPersonaId ?? 'system'}</td>
                  <td className="py-2 pr-4 font-medium">{e.action}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.objectRef}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.snapshotHash}</td>
                  <td className="py-2 text-ink-soft">{e.rationale ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function AuditPage() {
  return (
    <SessionGuard>
      <AuditView />
    </SessionGuard>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useSessionStore } from '@/stores/sessionStore';
import {
  deleteSession,
  duplicateSession,
  listSessions,
  loadSession,
  renameSession,
  type SessionSummary,
} from '@/persistence/storage';
import { downloadBundleZip } from './bundle';

/**
 * Simulation Library (PLAN Section 18). List/load/delete, JSON export/import
 * with round-trip guarantee, plus M6 duplicate/rename and ZIP bundle export.
 */
export function LibraryPage() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const adoptSession = useSessionStore((s) => s.adoptSession);
  const exportSessionJson = useSessionStore((s) => s.exportSessionJson);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void listSessions().then(setSessions);
  };
  useEffect(refresh, [session]);

  const load = async (id: string) => {
    try {
      const s = await loadSession(id);
      if (s) {
        adoptSession(s);
        navigate('/holdings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string) => {
    await deleteSession(id);
    refresh();
  };

  const rename = async (id: string, current: string) => {
    const next = window.prompt('Rename session', current);
    if (next && next.trim()) {
      await renameSession(id, next.trim());
      refresh();
    }
  };

  const duplicate = async (id: string) => {
    await duplicateSession(id);
    refresh();
  };

  const bundle = async (id: string) => {
    setError(null);
    try {
      const s = await loadSession(id);
      if (s) await downloadBundleZip(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const exportActive = () => {
    const json = exportSessionJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holdings-hub-session.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('Import rejected: file exceeds the 5 MB safety cap.');
      return;
    }
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      adoptSession(parsed as never); // Zod-validated inside adoptSession
      navigate('/holdings');
    } catch (err) {
      setError(
        `Import rejected: ${err instanceof Error ? err.message.slice(0, 300) : 'invalid file'}`,
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Simulation library</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          {session && (
            <Button variant="secondary" onClick={exportActive} data-testid="export-session">
              Export active session
            </Button>
          )}
          <Button onClick={() => navigate('/wizard/step/1')}>New session (wizard)</Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        aria-label="Import session JSON"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = '';
        }}
      />
      {error && (
        <Card>
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        </Card>
      )}
      <Card>
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-soft">No stored sessions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-3"
                data-testid="library-item"
                data-session-id={s.id}
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-ink-soft">
                    saved {s.savedAt} · schema v{s.schemaVersion}
                    {session?.id === s.id && (
                      <Badge tone="accent" className="ml-2">
                        active
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void load(s.id)}>
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void rename(s.id, s.name)}
                    data-testid="rename-session"
                  >
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void duplicate(s.id)}
                    data-testid="duplicate-session"
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void bundle(s.id)}
                    data-testid="bundle-session"
                  >
                    Bundle (ZIP)
                  </Button>
                  <Button variant="danger" onClick={() => void remove(s.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

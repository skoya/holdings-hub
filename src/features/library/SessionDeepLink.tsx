import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { useSessionStore } from '@/stores/sessionStore';
import { loadSession } from '@/persistence/storage';

/**
 * Deep-link restoration (PLAN Section 20). `#/open/:id` reconstructs a shared
 * view if the session exists locally, otherwise prompts to import it. No
 * server-side routing dependency (GitHub Pages constraint, ADR-003).
 */
export function SessionDeepLink() {
  const { id } = useParams();
  const navigate = useNavigate();
  const adoptSession = useSessionStore((s) => s.adoptSession);
  const [status, setStatus] = useState<'loading' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) {
        setStatus('missing');
        return;
      }
      try {
        const session = await loadSession(id);
        if (cancelled) return;
        if (session) {
          adoptSession(session);
          navigate('/holdings', { replace: true });
        } else {
          setStatus('missing');
        }
      } catch {
        if (!cancelled) setStatus('missing');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, adoptSession, navigate]);

  if (status === 'loading') {
    return (
      <Card title="Opening shared session…">
        <p className="text-sm text-ink-soft" data-testid="deeplink-loading">
          Restoring session <span className="font-mono text-xs">{id}</span> from local storage.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Session not found locally">
      <p className="text-sm text-ink-soft" data-testid="deeplink-missing">
        The shared session <span className="font-mono text-xs">{id}</span> is not in this browser.
        Import its JSON or bundle to open it.
      </p>
      <div className="mt-3 flex gap-3 text-sm">
        <Link className="text-accent underline" to="/library">
          Open the library to import
        </Link>
        <Link className="text-accent underline" to="/wizard/step/1">
          Or start a new session
        </Link>
      </div>
    </Card>
  );
}

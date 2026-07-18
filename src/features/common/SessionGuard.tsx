import { Link } from 'react-router-dom';
import { Card } from '@/components/Card';
import { useSessionStore } from '@/stores/sessionStore';
import type { ReactNode } from 'react';

/** Wraps session-dependent routes: prompts for the wizard when none is active. */
export function SessionGuard({ children }: { children: ReactNode }) {
  const session = useSessionStore((s) => s.session);
  if (!session) {
    return (
      <Card title="No active simulation session">
        <p className="text-sm text-ink-soft">
          Create a session with the setup wizard, or load one from the library.
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link className="text-accent underline" to="/wizard/step/1">
            Start the wizard
          </Link>
          <Link className="text-accent underline" to="/library">
            Open the library
          </Link>
        </div>
      </Card>
    );
  }
  return <>{children}</>;
}

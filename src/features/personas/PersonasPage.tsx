import { Link } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PERSONA_JOURNEYS } from '@/config/catalog';
import { useSessionStore } from '@/stores/sessionStore';

export function PersonasPage() {
  const session = useSessionStore((state) => state.session);
  const switchPersona = useSessionStore((state) => state.switchPersona);

  if (!session) {
    return (
      <Card title="Persona workbench">
        <p className="text-sm text-ink-soft">Create or load a session to explore role journeys.</p>
        <Link className="mt-3 inline-block text-sm text-accent underline" to="/wizard/step/1">
          Create a session
        </Link>
      </Card>
    );
  }

  const active = session.personas.find((persona) => persona.id === session.activePersonaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Persona workbench</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Switch jobs-to-be-done and follow the hand-offs across decision, control, execution and
          evidence.
        </p>
      </div>

      <Card title="Acting persona">
        <p className="text-sm">
          <strong>{active?.displayName}</strong> · {active?.role}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Persona changes are recorded in the append-only simulation audit log.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PERSONA_JOURNEYS.map((journey) => {
          const persona = session.personas.find((candidate) => candidate.role === journey.role);
          const isActive = persona?.id === session.activePersonaId;
          const levels = persona
            ? [...new Set(persona.grants.map((grant) => grant.level))].join(', ')
            : '';

          return (
            <Card key={journey.role} title={journey.title}>
              <div className="flex flex-wrap gap-2">
                <Badge tone={isActive ? 'success' : 'neutral'}>
                  {persona?.displayName ?? journey.role}
                </Badge>
                {levels && <Badge tone="neutral">{levels}</Badge>}
              </div>
              <p className="mt-3 text-sm">{journey.objective}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="font-medium">Scenario</dt>
                  <dd className="text-ink-soft">{journey.scenario}</dd>
                </div>
                <div>
                  <dt className="font-medium">Control boundary</dt>
                  <dd className="text-ink-soft">{journey.control}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                {persona && !isActive && (
                  <Button onClick={() => switchPersona(persona.id)}>Act as this persona</Button>
                )}
                <Link
                  className="self-center text-sm text-accent underline"
                  to={journey.nextAction.to}
                >
                  {journey.nextAction.label}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

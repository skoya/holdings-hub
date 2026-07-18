import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Badge } from '@/components/Badge';
import { useWizardStore } from './wizardStore';
import { useSessionStore } from '@/stores/sessionStore';
import { JurisdictionSchema, RelationshipSchema, type Relationship } from '@/schemas';

const STEPS = ['Entity', 'Relationships', 'Persona', 'Scenario seed', 'Review'] as const;

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  custody: 'Custody',
  payments: 'Payments & cash management',
  'wallet-services': 'Wallet services (digital-asset custody)',
  brokerage: 'Brokerage / execution',
  fx: 'FX',
  lending: 'Lending / credit',
  'fund-administration': 'Fund administration',
  'tokenisation-agent': 'Tokenisation agent',
};

/**
 * Setup wizard (PLAN Section 7). Every step is deep-linkable
 * (#/wizard/step/N) and validated before advancing. M2 ships the vertical
 * slice template (single-family office / CIO); templates for all entity
 * types arrive in M3.
 */
export function WizardPage() {
  const { step: stepParam } = useParams();
  const navigate = useNavigate();
  const draft = useWizardStore();
  const createSliceSession = useSessionStore((s) => s.createSliceSession);

  const step = Math.min(Math.max(Number(stepParam) || 1, 1), STEPS.length);
  const goto = (n: number) => navigate(`/wizard/step/${n}`);

  const stepValid = (() => {
    switch (step) {
      case 1:
        return draft.entityName.trim().length > 0 && JurisdictionSchema.safeParse(draft.jurisdiction).success;
      case 2:
        return draft.relationships.length > 0;
      case 3:
        return draft.personaDisplayName.trim().length > 0;
      case 4:
        return Number.isInteger(draft.seed);
      default:
        return draft.sessionName.trim().length > 0;
    }
  })();

  const toggleRelationship = (rel: Relationship) => {
    draft.update({
      relationships: draft.relationships.includes(rel)
        ? draft.relationships.filter((r) => r !== rel)
        : [...draft.relationships, rel],
    });
  };

  const finish = () => {
    createSliceSession({
      sessionName: draft.sessionName,
      entityName: draft.entityName,
      jurisdiction: draft.jurisdiction,
      relationships: draft.relationships,
      personaDisplayName: draft.personaDisplayName,
      seed: draft.seed,
    });
    navigate('/holdings');
  };

  const labelCls = 'block text-sm font-medium mb-1';
  const inputCls =
    'w-full rounded border border-line bg-panel px-3 py-2 text-sm focus:border-dark';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <nav aria-label="Wizard progress" className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <Badge key={label} tone={i + 1 === step ? 'accent' : 'neutral'}>
            {i + 1}. {label}
          </Badge>
        ))}
      </nav>

      {step === 1 && (
        <Card title="Step 1 — Entity">
          <p className="mb-3 text-sm text-ink-soft">
            The M2 vertical slice models a single-family office. Further entity types (corporate
            treasury, funds, …) arrive in Milestone 3.
          </p>
          <label className={labelCls} htmlFor="entityName">
            Entity name
          </label>
          <input
            id="entityName"
            className={inputCls}
            value={draft.entityName}
            onChange={(e) => draft.update({ entityName: e.target.value })}
          />
          <label className={`${labelCls} mt-3`} htmlFor="jurisdiction">
            Jurisdiction
          </label>
          <select
            id="jurisdiction"
            className={inputCls}
            value={draft.jurisdiction}
            onChange={(e) =>
              draft.update({ jurisdiction: JurisdictionSchema.parse(e.target.value) })
            }
          >
            {JurisdictionSchema.options.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 2 — Relationships with Meridian">
          <p className="mb-3 text-sm text-ink-soft">
            Relationships gate feature availability. The slice needs custody, payments and wallet
            services.
          </p>
          <div className="flex flex-wrap gap-2">
            {RelationshipSchema.options.map((rel) => (
              <Chip
                key={rel}
                selected={draft.relationships.includes(rel)}
                onClick={() => toggleRelationship(rel)}
              >
                {RELATIONSHIP_LABELS[rel]}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 3 — Persona">
          <p className="mb-3 text-sm text-ink-soft">
            Persona: CIO / investment director with view+approve entitlements across custody,
            payments and wallet services, and a £1m per-transaction limit.
          </p>
          <label className={labelCls} htmlFor="personaName">
            Display name
          </label>
          <input
            id="personaName"
            className={inputCls}
            value={draft.personaDisplayName}
            onChange={(e) => draft.update({ personaDisplayName: e.target.value })}
          />
        </Card>
      )}

      {step === 4 && (
        <Card title="Step 4 — Scenario seed">
          <p className="mb-3 text-sm text-ink-soft">
            The seed drives every simulated outcome. Same seed + same actions ⇒ identical
            holdings, screening results, ids and audit log.
          </p>
          <label className={labelCls} htmlFor="seed">
            Deterministic seed
          </label>
          <input
            id="seed"
            type="number"
            className={inputCls}
            value={draft.seed}
            onChange={(e) => draft.update({ seed: Number(e.target.value) })}
          />
        </Card>
      )}

      {step === 5 && (
        <Card title="Step 5 — Review & create">
          <label className={labelCls} htmlFor="sessionName">
            Session name
          </label>
          <input
            id="sessionName"
            className={inputCls}
            value={draft.sessionName}
            onChange={(e) => draft.update({ sessionName: e.target.value })}
          />
          <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">Entity</dt>
            <dd>
              {draft.entityName} ({draft.jurisdiction})
            </dd>
            <dt className="text-ink-soft">Relationships</dt>
            <dd>{draft.relationships.map((r) => RELATIONSHIP_LABELS[r]).join(', ')}</dd>
            <dt className="text-ink-soft">Persona</dt>
            <dd>{draft.personaDisplayName}</dd>
            <dt className="text-ink-soft">Seed</dt>
            <dd>{draft.seed}</dd>
          </dl>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 1} onClick={() => goto(step - 1)}>
          Back
        </Button>
        {step < STEPS.length ? (
          <Button disabled={!stepValid} onClick={() => goto(step + 1)}>
            Next
          </Button>
        ) : (
          <Button disabled={!stepValid} onClick={finish} data-testid="wizard-create">
            Create session
          </Button>
        )}
      </div>
    </div>
  );
}

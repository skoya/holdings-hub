import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ASSETS,
  ENTITY_TEMPLATES,
  PERSONA_TEMPLATES,
  SCENARIO_PRESETS,
  assetById,
  entityTemplate,
  personaTemplate,
} from '@/config/catalog';
import { DIAGRAM_DEFS, diagramForTransactionType } from '@/config/diagrams';
import {
  AssetSchema,
  EntitlementGrantSchema,
  EntityTypeSchema,
  PersonaLimitsSchema,
  PersonaRoleSchema,
  RelationshipSchema,
} from '@/schemas';
import { useSessionStore } from '@/stores/sessionStore';

describe('configuration catalogue validation (PLAN Section 32)', () => {
  it('asset catalogue is schema-valid with unique ids and covers all classes', () => {
    z.array(AssetSchema).parse(ASSETS);
    const ids = ASSETS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const classes = new Set(ASSETS.map((a) => a.class));
    for (const cls of [
      'cash',
      'equity',
      'bond',
      'fund',
      'tokenised',
      'stablecoin',
      'crypto',
      'defi',
    ]) {
      expect(classes.has(cls as never), `missing asset class ${cls}`).toBe(true);
    }
  });

  it('entity templates cover every entity type with valid relationships', () => {
    expect(ENTITY_TEMPLATES.map((t) => t.type).sort()).toEqual(
      [...EntityTypeSchema.options].sort(),
    );
    for (const t of ENTITY_TEMPLATES) {
      z.array(RelationshipSchema).min(1).parse(t.relationships);
      expect(entityTemplate(t.type)).toBe(t);
    }
  });

  it('persona templates cover every role with valid grants and limits', () => {
    expect(PERSONA_TEMPLATES.map((t) => t.role).sort()).toEqual(
      [...PersonaRoleSchema.options].sort(),
    );
    for (const t of PERSONA_TEMPLATES) {
      z.array(EntitlementGrantSchema).parse(t.grants);
      if (t.limits) PersonaLimitsSchema.parse(t.limits);
      expect(personaTemplate(t.role)).toBe(t);
    }
  });

  it('scenario preset portfolios reference existing assets only', () => {
    for (const preset of SCENARIO_PRESETS) {
      for (const [assetRef] of preset.portfolio) {
        expect(() => assetById(assetRef), `${preset.id}: ${assetRef}`).not.toThrow();
      }
    }
  });

  it('every scenario preset creates a schema-valid session via the store', () => {
    for (const preset of SCENARIO_PRESETS) {
      useSessionStore.getState().clearSession();
      const id = useSessionStore.getState().createSliceSession({
        presetId: preset.id,
        sessionName: `${preset.label} test`,
        entityName: 'Config Test Entity',
        jurisdiction: 'GB',
        relationships: ['custody', 'payments'],
        personaDisplayName: 'Config Tester',
        seed: preset.defaultSeed,
      });
      expect(id).toBeTruthy();
      const session = useSessionStore.getState().session!;
      expect(session.holdings).toHaveLength(preset.portfolio.length);
      expect(session.personas[0]!.role).toBe(preset.personaRole);
      expect(session.personas.map((persona) => persona.role)).toEqual(
        expect.arrayContaining([
          'treasurer',
          'compliance-officer',
          'operations-manager',
          'external-auditor',
        ]),
      );
      expect(
        session.personas
          .find((persona) => persona.role === 'external-auditor')
          ?.grants.every((grant) => grant.level === 'view'),
      ).toBe(true);
    }
  });

  it('diagram definitions are valid and mapped for every flow family', () => {
    expect(Object.keys(DIAGRAM_DEFS).length).toBeGreaterThanOrEqual(3);
    // Every edge endpoint must reference a defined node.
    for (const def of Object.values(DIAGRAM_DEFS)) {
      const nodeIds = new Set(def.nodes.map((n) => n.id));
      for (const e of def.edges) {
        expect(nodeIds.has(e.from), `${def.id}: ${e.from}`).toBe(true);
        expect(nodeIds.has(e.to), `${def.id}: ${e.to}`).toBe(true);
      }
    }
    expect(diagramForTransactionType('dsvp-settlement').id).toBe('dsvp-sequence');
    expect(diagramForTransactionType('stablecoin-transfer').id).toBe('stablecoin-lifecycle');
    expect(diagramForTransactionType('cross-border-payment').id).toBe('payment-lifecycle');
  });
});

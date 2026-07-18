import { create } from 'zustand';
import {
  SCENARIO_PRESETS,
  entityTemplate,
  personaTemplate,
  scenarioPreset,
} from '@/config/catalog';
import type { Jurisdiction, Relationship } from '@/schemas';

/** Draft state for the setup wizard (PLAN Section 7). Survives step navigation. */
interface WizardDraft {
  presetId: string;
  sessionName: string;
  entityName: string;
  jurisdiction: Jurisdiction;
  relationships: Relationship[];
  personaDisplayName: string;
  seed: number;
  defiEnabled: boolean;
  update: (partial: Partial<Omit<WizardDraft, 'update' | 'reset' | 'applyPreset'>>) => void;
  applyPreset: (presetId: string) => void;
  reset: () => void;
}

function fromPreset(presetId: string) {
  const preset = scenarioPreset(presetId);
  const entity = entityTemplate(preset.entityType);
  const persona = personaTemplate(preset.personaRole);
  return {
    presetId,
    sessionName: `${preset.label} — demo`,
    entityName: entity.defaultName,
    jurisdiction: entity.defaultJurisdiction,
    relationships: [...entity.relationships],
    personaDisplayName: persona.defaultDisplayName,
    seed: preset.defaultSeed,
    defiEnabled: false,
  };
}

const initial = fromPreset(SCENARIO_PRESETS[0]!.id);

export const useWizardStore = create<WizardDraft>((set) => ({
  ...initial,
  update: (partial) => set(partial),
  applyPreset: (presetId) => set(fromPreset(presetId)),
  reset: () => set(fromPreset(SCENARIO_PRESETS[0]!.id)),
}));

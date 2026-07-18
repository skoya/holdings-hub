import { create } from 'zustand';
import { DEFAULT_SEED, FAMILY_OFFICE_TEMPLATE } from '@/config/catalog';
import type { Jurisdiction, Relationship } from '@/schemas';

/** Draft state for the setup wizard (PLAN Section 7). Survives step navigation. */
interface WizardDraft {
  sessionName: string;
  entityName: string;
  jurisdiction: Jurisdiction;
  relationships: Relationship[];
  personaDisplayName: string;
  seed: number;
  update: (partial: Partial<Omit<WizardDraft, 'update' | 'reset'>>) => void;
  reset: () => void;
}

const initial = {
  sessionName: 'Family Office CIO — demo',
  entityName: FAMILY_OFFICE_TEMPLATE.name,
  jurisdiction: FAMILY_OFFICE_TEMPLATE.jurisdiction,
  relationships: [...FAMILY_OFFICE_TEMPLATE.relationships] as Relationship[],
  personaDisplayName: 'Investment Director (CIO)',
  seed: DEFAULT_SEED,
};

export const useWizardStore = create<WizardDraft>((set) => ({
  ...initial,
  update: (partial) => set(partial),
  reset: () => set(initial),
}));

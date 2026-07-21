import { create } from 'zustand';

/**
 * Ephemeral UI state (never persisted).
 *
 * timeCursor: when set, Timeline and Graph render a historical snapshot as
 * of that UTC timestamp instead of live session state.
 *
 * rightPanel: a collapsible side panel with Timeline / Graph tabs. Opening
 * via openPanel() switches the tab; closePanel() hides it.
 */
interface UiStore {
  timeCursor: string | null;
  setTimeCursor: (ts: string | null) => void;

  rightPanelOpen: boolean;
  rightPanelTab: 'timeline' | 'graph';
  openPanel: (tab: 'timeline' | 'graph') => void;
  closePanel: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  timeCursor: null,
  setTimeCursor: (ts) => set({ timeCursor: ts }),

  rightPanelOpen: false,
  rightPanelTab: 'timeline',
  openPanel: (tab) => set({ rightPanelOpen: true, rightPanelTab: tab }),
  closePanel: () => set({ rightPanelOpen: false }),
}));

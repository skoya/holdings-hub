import { create } from 'zustand';

/**
 * Ephemeral UI state (never persisted). Currently holds the simulation
 * time cursor — when set, both the Timeline and Graph pages render a
 * historical view as of that UTC timestamp instead of the live session state.
 */
interface UiStore {
  /** ISO UTC timestamp to "view as of", or null = live (current session clock). */
  timeCursor: string | null;
  setTimeCursor: (ts: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  timeCursor: null,
  setTimeCursor: (ts) => set({ timeCursor: ts }),
}));

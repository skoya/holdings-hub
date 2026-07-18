import { create } from 'zustand';
import { createEngine, Engine, type EngineState } from '@/engine/prng';

/**
 * Minimal session store for M1: holds the active seed and engine. Grows into
 * the full SimulationSession store in M2 (every mutating action will emit an
 * AuditEvent per PLAN Section 17).
 */

const DEFAULT_SEED = 42;

interface SessionStoreState {
  seed: number;
  engine: Engine;
  engineState: EngineState;
  reseed: (seed: number) => void;
  /** Advance the engine (demo/diagnostics) and refresh the serialised state. */
  drawSample: (namespace: string) => number;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  seed: DEFAULT_SEED,
  engine: createEngine(DEFAULT_SEED),
  engineState: createEngine(DEFAULT_SEED).serialize(),
  reseed: (seed) => {
    const engine = createEngine(seed);
    set({ seed, engine, engineState: engine.serialize() });
  },
  drawSample: (namespace) => {
    const { engine } = get();
    const value = engine.fork(namespace).next();
    set({ engineState: engine.serialize() });
    return value;
  },
}));

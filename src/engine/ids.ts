import type { Engine } from './prng';

/** Deterministic id generator — draws from the 'ids' stream. */
export function nextId(engine: Engine, prefix: string): string {
  const stream = engine.fork('ids');
  const a = stream.nextInt(0, 0xffffff).toString(16).padStart(6, '0');
  const b = stream.nextInt(0, 0xffffff).toString(16).padStart(6, '0');
  return `${prefix}-${a}${b}`;
}

/** Fictional payment reference, clearly simulated. */
export function nextReference(engine: Engine): string {
  const stream = engine.fork('ids');
  const n = stream.nextInt(100000, 999999);
  return `SIM-REF-${n}`;
}

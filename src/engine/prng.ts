import { xoroshiro128plus, type RandomGenerator } from 'pure-rand';
import { fnv1a } from './hash';

/**
 * Deterministic simulation engine (PLAN Section 23, ADR-004).
 *
 * One root seed per session; namespaced sub-streams are derived from the root
 * so features do not perturb each other's randomness. Serialisation stores the
 * seed plus the draw count of every stream; restore re-seeds and replays the
 * draws. Every public method consumes exactly one underlying draw, which keeps
 * the counts exact.
 */

const FLOAT_DIV = 0x100000000; // 2^32

export interface EngineState {
  seed: number;
  streams: Record<string, number>;
}

export class Stream {
  private gen: RandomGenerator;
  private drawCount = 0;

  constructor(streamSeed: number, skip = 0) {
    this.gen = xoroshiro128plus(streamSeed);
    for (let i = 0; i < skip; i++) this.gen.unsafeNext();
    this.drawCount = skip;
  }

  get count(): number {
    return this.drawCount;
  }

  /** Uniform float in [0, 1). Consumes one draw. */
  next(): number {
    this.drawCount += 1;
    return (this.gen.unsafeNext() >>> 0) / FLOAT_DIV;
  }

  /** Uniform integer in [min, max] inclusive. Consumes one draw. */
  nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new RangeError('nextInt() requires integer bounds');
    }
    if (max < min) {
      throw new RangeError(`nextInt() bounds inverted: [${min}, ${max}]`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniform pick from a non-empty array. Consumes one draw. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('pick() requires a non-empty array');
    }
    return items[this.nextInt(0, items.length - 1)] as T;
  }
}

export class Engine {
  readonly seed: number;
  private streams = new Map<string, Stream>();

  constructor(seed: number, restoreCounts: Record<string, number> = {}) {
    if (!Number.isInteger(seed)) throw new RangeError('Engine seed must be an integer');
    this.seed = seed;
    for (const [namespace, count] of Object.entries(restoreCounts)) {
      this.streams.set(namespace, new Stream(this.streamSeed(namespace), count));
    }
  }

  private streamSeed(namespace: string): number {
    // Mix, don't just XOR: keeps the root stream distinct from a namespace
    // whose hash happens to be zero.
    return (Math.imul(this.seed ^ fnv1a(`hh:${namespace}`), 0x9e3779b1) >>> 0) | 0;
  }

  /** Namespaced sub-stream; repeated calls return the same stream instance. */
  fork(namespace: string): Stream {
    let stream = this.streams.get(namespace);
    if (!stream) {
      stream = new Stream(this.streamSeed(namespace));
      this.streams.set(namespace, stream);
    }
    return stream;
  }

  next(): number {
    return this.fork('root').next();
  }

  nextInt(min: number, max: number): number {
    return this.fork('root').nextInt(min, max);
  }

  pick<T>(items: readonly T[]): T {
    return this.fork('root').pick(items);
  }

  serialize(): EngineState {
    const streams: Record<string, number> = {};
    for (const [namespace, stream] of this.streams) streams[namespace] = stream.count;
    return { seed: this.seed, streams };
  }

  static restore(state: EngineState): Engine {
    return new Engine(state.seed, state.streams);
  }
}

export function createEngine(seed: number): Engine {
  return new Engine(seed);
}

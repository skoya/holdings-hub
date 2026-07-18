import { describe, expect, it } from 'vitest';
import { createEngine, Engine } from '@/engine/prng';

describe('deterministic engine (PLAN Section 23)', () => {
  it('same seed produces an identical sequence', () => {
    const a = createEngine(1234);
    const b = createEngine(1234);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createEngine(1);
    const b = createEngine(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays in [0, 1) and is never NaN', () => {
    const engine = createEngine(99);
    for (let i = 0; i < 1000; i++) {
      const v = engine.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('nextInt() respects inclusive bounds and hits both endpoints', () => {
    const engine = createEngine(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = engine.nextInt(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6]));
  });

  it('nextInt() rejects invalid bounds', () => {
    const engine = createEngine(7);
    expect(() => engine.nextInt(5, 4)).toThrow(RangeError);
    expect(() => engine.nextInt(0.5, 2)).toThrow(RangeError);
  });

  it('pick() returns members of the array and rejects empty arrays', () => {
    const engine = createEngine(21);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(engine.pick(items));
    }
    expect(() => engine.pick([])).toThrow(RangeError);
  });

  it('namespaced forks are isolated: consuming one does not perturb another', () => {
    const reference = createEngine(555);
    const marketOnly = Array.from({ length: 20 }, () => reference.fork('market').next());

    const engine = createEngine(555);
    // Interleave heavy consumption of other namespaces.
    for (let i = 0; i < 100; i++) {
      engine.fork('screening').next();
      engine.fork('latency').next();
      engine.next();
    }
    const market = Array.from({ length: 20 }, () => engine.fork('market').next());
    expect(market).toEqual(marketOnly);
  });

  it('forks with the same namespace share one continuing stream', () => {
    const engine = createEngine(42);
    const first = engine.fork('ids').next();
    const second = engine.fork('ids').next();
    expect(first).not.toEqual(second);

    const replay = createEngine(42).fork('ids');
    expect(replay.next()).toEqual(first);
    expect(replay.next()).toEqual(second);
  });

  it('serialize()/restore() round-trips mid-stream state exactly', () => {
    const engine = createEngine(2026);
    engine.fork('market');
    for (let i = 0; i < 17; i++) engine.fork('market').next();
    for (let i = 0; i < 5; i++) engine.nextInt(0, 1_000_000);

    const state = engine.serialize();
    const restored = Engine.restore(state);

    const expected = Array.from({ length: 25 }, () => engine.fork('market').next());
    const actual = Array.from({ length: 25 }, () => restored.fork('market').next());
    expect(actual).toEqual(expected);

    expect(restored.nextInt(0, 1_000_000)).toEqual(
      Engine.restore(state).nextInt(0, 1_000_000),
    );
  });

  it('serialized state is plain JSON and survives stringify/parse', () => {
    const engine = createEngine(31337);
    engine.fork('market').next();
    engine.next();
    const roundTripped = JSON.parse(JSON.stringify(engine.serialize()));
    const restored = Engine.restore(roundTripped);
    expect(restored.next()).toEqual(engine.next());
  });

  it('restore() of a fresh engine state matches a fresh engine', () => {
    const state = createEngine(9).serialize();
    const restored = Engine.restore(state);
    const fresh = createEngine(9);
    const a = Array.from({ length: 10 }, () => restored.next());
    const b = Array.from({ length: 10 }, () => fresh.next());
    expect(a).toEqual(b);
  });

  it('rejects non-integer seeds', () => {
    expect(() => createEngine(1.5)).toThrow(RangeError);
  });

  it('produces a roughly uniform distribution (sanity, not statistics)', () => {
    const engine = createEngine(777);
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      buckets[Math.floor(engine.next() * 4)]! += 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

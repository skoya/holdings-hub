import { describe, expect, it } from 'vitest';
import { SimulationSessionSchema } from '@/schemas';
import { makeSession } from '../fixtures/session';

/**
 * Import fuzz / hardening tests (PLAN Section 30 / M8). The JSON import path is
 * the only untrusted input to the app. It must reject hostile or malformed
 * payloads safely — no throw-through beyond a validation error, no prototype
 * pollution, no acceptance of malformed sessions.
 */
describe('import hardening (M8)', () => {
  const hostile: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['a bare string', 'not a session'],
    ['a number', 42],
    ['an array', [makeSession()]],
    ['an empty object', {}],
    ['a session missing required fields', { id: 'x', name: 'y' }],
    ['a session with a wrong-typed seed', { ...makeSession(), seed: 'not-a-number' }],
    ['a session with an invalid schemaVersion', { ...makeSession(), schemaVersion: 999 }],
    ['a session with a non-array auditLog', { ...makeSession(), auditLog: 'nope' }],
  ];

  for (const [label, input] of hostile) {
    it(`rejects ${label} via safeParse without throwing`, () => {
      const result = SimulationSessionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  }

  it('parse() throws (does not silently accept) on malformed input', () => {
    expect(() => SimulationSessionSchema.parse({ id: 'x' })).toThrow();
  });

  it('does not pollute Object.prototype from a __proto__ payload', () => {
    // JSON.parse creates an OWN "__proto__" property; Zod's object schema strips
    // unknown keys, so nothing reaches the prototype chain.
    const payload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"x": 1}}');
    SimulationSessionSchema.safeParse(payload);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strips unknown/injected keys from an otherwise valid session', () => {
    const withExtra = { ...makeSession(), __proto__: { polluted: true }, injected: 'x' };
    const parsed = SimulationSessionSchema.parse(withExtra);
    expect((parsed as Record<string, unknown>).injected).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects a deeply nested / structurally invalid payload without stack overflow', () => {
    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let i = 0; i < 10_000; i++) {
      nested.child = {};
      nested = nested.child as Record<string, unknown>;
    }
    const result = SimulationSessionSchema.safeParse(root);
    expect(result.success).toBe(false);
  });
});

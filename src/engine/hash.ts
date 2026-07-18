/** FNV-1a 32-bit hash. Used for namespace derivation and cheap state hashes. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable hex hash of any JSON-serialisable value (key order as produced). */
export function hashObject(value: unknown): string {
  return fnv1a(JSON.stringify(value)).toString(16).padStart(8, '0');
}

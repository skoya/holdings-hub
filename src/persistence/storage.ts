import localforage from 'localforage';
import { SCHEMA_VERSION, SimulationSessionSchema, type SimulationSession } from '@/schemas';
import { runMigrations } from '@/schemas/migrations';

/**
 * Persistence layer (PLAN Section 24, ADR-007). Sessions are stored in
 * IndexedDB via localforage (localStorage fallback) inside a versioned
 * envelope so older saves can be migrated on load.
 */

export interface Envelope {
  schemaVersion: number;
  savedAt: string; // UTC ISO 8601
  payload: unknown;
}

export interface SessionSummary {
  id: string;
  name: string;
  savedAt: string;
  schemaVersion: number;
}

const store = localforage.createInstance({
  name: 'holdings-hub',
  storeName: 'sessions',
  description: 'Meridian Bank Holdings Hub simulation library (simulation only)',
});

const KEY_PREFIX = 'session:';

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export class StorageQuotaError extends Error {
  constructor(cause: unknown) {
    super(
      'Could not save the session — browser storage may be full. ' +
        'Export existing sessions to JSON, delete unused ones, then retry.',
    );
    this.name = 'StorageQuotaError';
    this.cause = cause;
  }
}

export async function saveSession(session: SimulationSession): Promise<void> {
  const payload = SimulationSessionSchema.parse(session);
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    payload,
  };
  try {
    await store.setItem(keyFor(payload.id), envelope);
  } catch (err) {
    throw new StorageQuotaError(err);
  }
}

export async function loadSession(id: string): Promise<SimulationSession | null> {
  const envelope = await store.getItem<Envelope>(keyFor(id));
  if (!envelope) return null;
  const migrated = runMigrations(envelope.schemaVersion, envelope.payload);
  return SimulationSessionSchema.parse(migrated);
}

export async function deleteSession(id: string): Promise<void> {
  await store.removeItem(keyFor(id));
}

export async function listSessions(): Promise<SessionSummary[]> {
  const keys = await store.keys();
  const summaries: SessionSummary[] = [];
  for (const key of keys) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const envelope = await store.getItem<Envelope>(key);
    if (!envelope) continue;
    const payload = envelope.payload as { id?: string; name?: string };
    summaries.push({
      id: payload.id ?? key.slice(KEY_PREFIX.length),
      name: payload.name ?? '(unnamed session)',
      savedAt: envelope.savedAt,
      schemaVersion: envelope.schemaVersion,
    });
  }
  summaries.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  return summaries;
}

/** Test/diagnostics helper: write a raw envelope without validation. */
export async function writeRawEnvelope(id: string, envelope: Envelope): Promise<void> {
  await store.setItem(keyFor(id), envelope);
}

export async function clearAllSessions(): Promise<void> {
  await store.clear();
}

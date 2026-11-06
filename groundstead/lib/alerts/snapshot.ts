import { publicAlerts } from './filter.ts';
import type { Alert, Kind, MsgType, Scope, Status } from './model.ts';
import { sourceState, type SourceState } from './sources.ts';

// The alert snapshot (GS-053): what the job last saw. It holds each source's state and the public alerts still in force.
// It never says that an area is safe; a source that failed says so, and keeps the time of its last good update.

export type SourceStatus = { source: string; state: SourceState; lastUpdated: string | null };
export type Snapshot = { generatedAt: string; sources: SourceStatus[]; alerts: Alert[] };

// One source's result for this run: whether it worked, when it last worked, and the alerts it gave.
export type SourceRun = { source: string; ok: boolean; fetchedAt: string | null; alerts: Alert[] };

export function buildSnapshot(runs: SourceRun[], now: Date, previous: Snapshot | null, maxAgeMinutes = 30): Snapshot {
  const sources: SourceStatus[] = runs.map((run) => {
    const prior = previous?.sources.find((s) => s.source === run.source)?.lastUpdated ?? null;
    const lastUpdated = run.ok ? run.fetchedAt : prior;
    return {
      source: run.source,
      state: sourceState({ lastUpdated, failed: !run.ok }, now, maxAgeMinutes),
      lastUpdated,
    };
  });
  const alerts = publicAlerts(runs.filter((run) => run.ok).flatMap((run) => run.alerts));
  return { generatedAt: now.toISOString(), sources, alerts };
}

const STATES: readonly SourceState[] = ['ok', 'stale', 'failed', 'never'];
const STATUSES: readonly Status[] = ['Actual', 'Exercise', 'System', 'Test', 'Draft'];
const MSG_TYPES: readonly MsgType[] = ['Alert', 'Update', 'Cancel', 'Ack', 'Error'];
const SCOPES: readonly Scope[] = ['Public', 'Restricted', 'Private'];
const KINDS: readonly Kind[] = ['observation', 'forecast', 'warning', 'order'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isText = (v: unknown): v is string => typeof v === 'string';

function alertOf(v: unknown): Alert {
  if (!isObject(v)) throw new Error('bad snapshot: an alert is not an object');
  const need = (name: string): unknown => v[name];
  if (
    !isText(need('source')) ||
    !isText(need('id')) ||
    !isText(need('sender')) ||
    !STATUSES.includes(need('status') as Status) ||
    !MSG_TYPES.includes(need('msgType') as MsgType) ||
    !SCOPES.includes(need('scope') as Scope) ||
    !KINDS.includes(need('kind') as Kind) ||
    !isText(need('headline')) ||
    !isText(need('hazard')) ||
    !isText(need('sent')) ||
    !isText(need('received')) ||
    !isText(need('effective')) ||
    !Array.isArray(need('references')) ||
    !(need('references') as unknown[]).every(isText)
  ) {
    throw new Error('bad snapshot: an alert is missing a field or has one of the wrong type');
  }
  return v as unknown as Alert;
}

// Reads a snapshot from JSON. A file of the wrong shape is refused with a reason, never read as "no alerts".
export function parseSnapshot(value: unknown): Snapshot {
  if (!isObject(value)) throw new Error('bad snapshot: not an object');
  if (!isText(value.generatedAt) || Number.isNaN(Date.parse(value.generatedAt))) {
    throw new Error('bad snapshot: generatedAt is not a time');
  }
  if (!Array.isArray(value.sources)) throw new Error('bad snapshot: sources is not a list');
  const sources: SourceStatus[] = value.sources.map((s: unknown) => {
    if (!isObject(s) || !isText(s.source) || !STATES.includes(s.state as SourceState)) {
      throw new Error('bad snapshot: a source has no name or an unknown state');
    }
    if (s.lastUpdated !== null && !isText(s.lastUpdated)) throw new Error('bad snapshot: lastUpdated is not text or null');
    return { source: s.source, state: s.state as SourceState, lastUpdated: s.lastUpdated as string | null };
  });
  if (!Array.isArray(value.alerts)) throw new Error('bad snapshot: alerts is not a list');
  return { generatedAt: value.generatedAt, sources, alerts: value.alerts.map(alertOf) };
}

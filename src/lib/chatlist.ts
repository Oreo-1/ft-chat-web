/**
 * Pure list logic (no Svelte, no network) so it can be unit tested.
 * Lists are kept NEWEST FIRST, matching the server sort "-created,-id".
 */
import type { RecordModel } from 'pocketbase';

export interface Msg extends RecordModel {
  created: string; // "2026-11-15 10:00:00.123Z" sorts correctly as a string
  text?: string;
  files?: string[];
  device?: string;
  user?: string;
}

/** > 0 if a is newer than b. */
export function compareMsg(a: Msg, b: Msg): number {
  if (a.created !== b.created) return a.created < b.created ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Insert or replace m, keeping newest-first order. If m is older than the
 * loaded window and there's more history, it's skipped (it'll arrive in
 * order when the user scrolls up).
 */
export function upsert(list: Msg[], m: Msg, hasMore: boolean): Msg[] {
  const rest = list.filter((x) => x.id !== m.id);
  if (hasMore && rest.length > 0 && compareMsg(m, rest[rest.length - 1]) < 0) return rest;
  const i = rest.findIndex((x) => compareMsg(m, x) > 0);
  if (i < 0) rest.push(m);
  else rest.splice(i, 0, m);
  return rest;
}

/**
 * Merge a freshly fetched newest page (`fresh`, asked for `want` items) into
 * what's loaded. Returns the new list and the new hasMore (null = unchanged).
 */
export function mergeLatest(
  list: Msg[],
  fresh: Msg[],
  want: number,
): { list: Msg[]; hasMore: boolean | null } {
  if (fresh.length < want) {
    // That's the entire history.
    return { list: fresh, hasMore: false };
  }
  const boundary = fresh[fresh.length - 1];
  // First load, or more arrived than this fetch covers (there'd be a gap):
  // start over. Strict timestamp check: a message created in the same ms as
  // our newest could sort below it by id, so don't trust the overlap then.
  if (list.length === 0 || list[0].created <= boundary.created) {
    return { list: fresh, hasMore: true };
  }
  // Overlap: the fresh page replaces its range (drops messages deleted
  // elsewhere); keep the older ones we already have.
  const older = list.filter((m) => compareMsg(m, boundary) < 0);
  return { list: [...fresh, ...older], hasMore: null };
}

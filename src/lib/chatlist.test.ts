/**
 * Randomized simulation of the chat list against a fake server:
 * realtime creates/deletes, coming back after many messages arrived,
 * deletions while away, paging back to the start. Invariant: what's shown is
 * always a gap-free, ordered slice of the newest server messages.
 */
import { describe, expect, it } from 'vitest';
import { compareMsg, mergeLatest, upsert, type Msg } from './chatlist';

const PAGE = 40;
const MAX_PER_PAGE = 500;

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe('chat list sync', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`stays consistent (seed ${seed})`, () => {
      const rand = rng(seed);
      const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
      let clock = 0;
      let server: Msg[] = [];
      const newMsg = (): Msg => {
        clock += pick([0, 1, 1, 2]); // same-ms messages on purpose
        const m = {
          id: Math.floor(rand() * 2 ** 48).toString(36).padStart(10, '0'),
          created: String(clock).padStart(8, '0'),
          collectionId: 'c',
          collectionName: 'ft_messages',
        } as Msg;
        server.push(m);
        return m;
      };
      const sorted = () => [...server].sort((a, b) => compareMsg(b, a));
      const getList = (n: number, olderThan?: Msg) =>
        sorted()
          .filter((m) => !olderThan || compareMsg(m, olderThan) < 0)
          .slice(0, n);

      let list: Msg[] = [];
      let hasMore = true;
      const loadLatest = () => {
        const want = Math.min(Math.max(list.length, PAGE), MAX_PER_PAGE);
        const r = mergeLatest(list, getList(want), want);
        list = r.list;
        if (r.hasMore !== null) hasMore = r.hasMore;
      };
      const loadOlder = () => {
        if (!hasMore || list.length === 0) return;
        const page = getList(PAGE, list[list.length - 1]);
        const known = new Set(list.map((m) => m.id));
        list = [...list, ...page.filter((m) => !known.has(m.id))];
        hasMore = page.length === PAGE;
      };
      const check = (where: string) => {
        const truth = sorted();
        // Allow stale extras only beyond the refreshed cap (documented).
        const k = Math.min(list.length, MAX_PER_PAGE);
        expect(list.slice(0, k).map((m) => m.id), where).toEqual(truth.slice(0, k).map((m) => m.id));
      };

      for (let i = 0; i < Math.floor(rand() * 300); i++) newMsg();
      loadLatest();
      check('initial');

      for (let step = 0; step < 300; step++) {
        const r = rand();
        if (r < 0.3) {
          list = upsert(list, newMsg(), hasMore); // realtime create
        } else if (r < 0.4) {
          // tab hidden: other device sends 0..120 messages, then visible -> refetch
          const n = pick([0, 1, 5, 39, 40, 41, 120]);
          for (let i = 0; i < n; i++) newMsg();
          loadLatest();
        } else if (r < 0.5 && list.length > 0) {
          // realtime delete
          const m = pick(list);
          server = server.filter((x) => x.id !== m.id);
          list = list.filter((x) => x.id !== m.id);
        } else if (r < 0.55 && server.length > 0) {
          // deleted while away, then refetch
          const m = pick(server);
          server = server.filter((x) => x.id !== m.id);
          loadLatest();
        } else {
          loadOlder();
        }
        check(`step ${step} r=${r.toFixed(2)}`);
      }

      while (hasMore) loadOlder();
      // Every server message is shown, in order, with no gaps. The only extras
      // allowed are stale ones deleted elsewhere while away from positions beyond
      // the MAX_PER_PAGE refresh window (the client treats their 404 as success).
      const live = new Set(server.map((m) => m.id));
      const stale = list.map((m, i) => ({ m, i })).filter(({ m }) => !live.has(m.id));
      expect(stale.every(({ i }) => i >= MAX_PER_PAGE)).toBe(true);
      expect(list.filter((m) => live.has(m.id)).map((m) => m.id)).toEqual(sorted().map((m) => m.id));
    });
  }
});

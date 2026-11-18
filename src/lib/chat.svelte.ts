import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase';
import { DEVICE_NAME, MAX_PER_PAGE, MESSAGES_COLLECTION, PAGE_SIZE } from './config';
import { mergeLatest, upsert, type Msg } from './chatlist';
import { errorText, pb } from './pb';

/**
 * Chat state + sync with PocketBase:
 * - newest PAGE_SIZE on open, older pages (cursor-based) while scrolling up
 * - realtime create/update/delete from your other devices
 * - refetch when the tab becomes visible again, the network comes back, or
 *   the SDK reconnects by itself (events during the gap would be lost)
 */
export class ChatStore {
  /** Newest first. */
  messages = $state<Msg[]>([]);
  initialLoading = $state(true);
  loadingOlder = $state(false);
  hasMore = $state(true);
  error = $state<string | null>(null);
  connected = $state(false);

  /** Ids that should animate in (just sent / arrived live). Read once at mount. */
  readonly appearing = new Set<string>();

  #latestInFlight: Promise<void> | null = null;
  #ownConnect = false;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #unsubs: UnsubscribeFunc[] = [];
  #stopped = false;

  get #col() {
    return pb.collection(MESSAGES_COLLECTION);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start() {
    pb.realtime.onDisconnect = () => {
      this.connected = false;
    };
    document.addEventListener('visibilitychange', this.#onVisibility);
    window.addEventListener('online', this.#onOnline);
    this.connect();
  }

  stop() {
    this.#stopped = true;
    document.removeEventListener('visibilitychange', this.#onVisibility);
    window.removeEventListener('online', this.#onOnline);
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    pb.realtime.onDisconnect = undefined;
    for (const u of this.#unsubs) u().catch(() => {});
    this.#unsubs = [];
  }

  #onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    // Mobile browsers often kill the connection in the background: reconnect
    // if it's gone; either way refetch what may have changed meanwhile.
    if (!this.connected) this.connect();
    else this.loadLatest();
  };

  #onOnline = () => this.connect();

  /** (Re)subscribe, then fetch. Subscribing first means nothing is missed. */
  async connect() {
    if (this.#stopped) return;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    try {
      await this.#subscribe();
    } catch {
      this.connected = false;
      this.#retryTimer = setTimeout(() => this.connect(), 5000);
    }
    await this.loadLatest();
  }

  async #subscribe() {
    for (const u of this.#unsubs) await u().catch(() => {});
    this.#unsubs = [];

    this.#ownConnect = true;
    this.#unsubs.push(
      await pb.realtime.subscribe('PB_CONNECT', () => {
        this.connected = true;
        if (this.#ownConnect) {
          this.#ownConnect = false; // the connect we initiated; connect() fetches
          return;
        }
        // The SDK reconnected on its own after a drop: refetch.
        this.loadLatest();
      }),
    );
    this.#unsubs.push(await this.#col.subscribe<Msg>('*', (e) => this.#onRealtime(e)));
  }

  #onRealtime(e: RecordSubscription<Msg>) {
    if (e.action === 'delete') {
      this.messages = this.messages.filter((m) => m.id !== e.record.id);
      return;
    }
    if (e.action === 'create') this.appearing.add(e.record.id);
    this.messages = upsert(this.messages, e.record, this.hasMore);
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  /** Refetch the newest window and merge. Concurrent calls share one request. */
  loadLatest(): Promise<void> {
    return (this.#latestInFlight ??= this.#doLoadLatest().finally(() => {
      this.#latestInFlight = null;
    }));
  }

  async #doLoadLatest() {
    // Refetch the whole loaded window (not just one page) so edits and
    // deletions made elsewhere are picked up; capped for very deep scrolls.
    const want = Math.min(Math.max(this.messages.length, PAGE_SIZE), MAX_PER_PAGE);
    try {
      const res = await this.#col.getList<Msg>(1, want, { sort: '-created,-id', skipTotal: true });
      const merged = mergeLatest(this.messages, res.items, want);
      this.messages = merged.list;
      if (merged.hasMore !== null) this.hasMore = merged.hasMore;
      this.error = null;
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.initialLoading = false;
    }
  }

  async loadOlder() {
    if (this.loadingOlder || !this.hasMore || this.messages.length === 0) return;
    this.loadingOlder = true;
    const oldest = this.messages[this.messages.length - 1];
    try {
      const res = await this.#col.getList<Msg>(1, PAGE_SIZE, {
        sort: '-created,-id',
        skipTotal: true,
        // Cursor pagination: stable while new messages keep arriving.
        filter: pb.filter('created < {:c} || (created = {:c} && id < {:id})', {
          c: oldest.created,
          id: oldest.id,
        }),
      });
      // The list may have been reset meanwhile; then drop this page.
      if (this.messages.at(-1)?.id !== oldest.id) return;
      const known = new Set(this.messages.map((m) => m.id));
      this.messages = [...this.messages, ...res.items.filter((m) => !known.has(m.id))];
      this.hasMore = res.items.length === PAGE_SIZE;
    } finally {
      this.loadingOlder = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Send text and/or files. Uses XHR instead of the SDK so we get upload
   * progress for big files. Abort via the returned controller's signal.
   */
  async send(
    text: string,
    files: File[],
    onProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const form = new FormData();
    form.append('user', pb.authStore.record!.id);
    form.append('text', text);
    form.append('device', DEVICE_NAME);
    for (const f of files) form.append('files', f, f.name);

    const record = await new Promise<Msg>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', pb.buildURL(`/api/collections/${MESSAGES_COLLECTION}/records`));
      xhr.setRequestHeader('Authorization', pb.authStore.token);
      xhr.responseType = 'json';
      xhr.upload.onprogress = (e) => onProgress?.(e.loaded, e.total);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as Msg);
        else reject({ status: xhr.status, response: xhr.response ?? {} });
      };
      xhr.onerror = () => reject({ status: 0, response: {} });
      xhr.onabort = () => reject({ status: 0, response: { message: 'Cancelled' }, isAbort: true });
      signal?.addEventListener('abort', () => xhr.abort());
      xhr.send(form);
    });

    this.appearing.add(record.id);
    this.messages = upsert(this.messages, record, this.hasMore);
  }

  async delete(m: Msg) {
    try {
      await this.#col.delete(m.id);
    } catch (e) {
      // 404: already deleted from another device, treat as success.
      if ((e as { status?: number }).status !== 404) throw e;
    }
    this.messages = this.messages.filter((x) => x.id !== m.id);
  }
}


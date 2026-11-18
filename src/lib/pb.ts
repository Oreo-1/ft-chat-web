import PocketBase from 'pocketbase';
import { PB_URL, USERS_COLLECTION } from './config';

/** Single PocketBase client. Auth is persisted in localStorage by the SDK. */
export const pb = new PocketBase(PB_URL);

// The SDK cancels duplicate in-flight requests by default; we deliberately run
// overlapping list requests (refresh + load older), so turn that off.
pb.autoCancellation(false);

/** Extend a stored session in the background (401 clears it -> login screen). */
export function refreshAuth(): void {
  if (pb.authStore.isValid) {
    pb.collection(USERS_COLLECTION).authRefresh().catch(() => {});
  }
}

export function errorText(e: unknown): string {
  const err = e as { status?: number; response?: { message?: string }; message?: string };
  if (err?.status === 0) return 'Network error';
  const msg = err?.response?.message;
  if (msg) return `${msg} (${err.status})`;
  if (err?.status) return `Error ${err.status}`;
  return String(err?.message ?? e);
}

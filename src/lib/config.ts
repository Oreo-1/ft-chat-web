/** App-wide configuration. Values come from .env (see VITE_* there). */

/** PocketBase base URL. Empty = same origin as the page (e.g. served from pb_public). */
export const PB_URL: string = import.meta.env.VITE_PB_URL || window.location.origin;

export const USERS_COLLECTION = 'ft_users';
export const MESSAGES_COLLECTION = 'ft_messages';

/**
 * Written into each message's `device` field. Messages whose device equals
 * this are drawn on the right; everything else on the left.
 */
export const DEVICE_NAME: string = import.meta.env.VITE_DEVICE_NAME || 'desktop';

/** Messages per page (initial load and each "load older" step). */
export const PAGE_SIZE = 40;

/** Biggest page PocketBase allows; used when refreshing a deep window. */
export const MAX_PER_PAGE = 500;

/**
 * Cloudflare (Free/Pro) rejects request bodies over 100 MB and the tunnel sits
 * in front of PocketBase, so this caps one message (all attachments + text).
 */
export const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

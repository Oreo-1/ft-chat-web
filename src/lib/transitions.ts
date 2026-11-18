import { cubicIn, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export const FAST = 180;
export const MEDIUM = 280;

/**
 * Grow out of `from` (a DOMRect on screen, e.g. the tapped thumbnail) into
 * the node's own position, and shrink back into it on close. Uniform scale so
 * content doesn't distort. Falls back to a small fade/scale with no origin.
 */
export function zoomFrom(
  node: Element,
  { from, duration = MEDIUM }: { from?: DOMRect | null; duration?: number },
): TransitionConfig {
  const to = node.getBoundingClientRect();
  if (!from || to.width === 0 || to.height === 0) {
    return {
      duration: FAST,
      easing: cubicOut,
      css: (t) => `opacity:${t}; transform: scale(${0.94 + 0.06 * t})`,
    };
  }
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = Math.min(1, Math.max(from.width / to.width, from.height / to.height));
  return {
    duration,
    easing: cubicOut,
    css: (t, u) =>
      `transform: translate(${dx * u}px, ${dy * u}px) scale(${s + (1 - s) * t});` +
      `opacity: ${Math.min(1, t * 2.5)}`,
  };
}

/** New message: grow in height, fade and rise. Disabled -> no animation. */
export function entry(node: HTMLElement, { enabled }: { enabled: boolean }): TransitionConfig {
  if (!enabled) return { duration: 0 };
  const h = node.offsetHeight;
  return {
    duration: MEDIUM,
    easing: cubicOut,
    css: (t, u) =>
      `height:${t * h}px; overflow:hidden; opacity:${t}; transform: translateY(${u * 12}px)`,
  };
}

/** Deleted message: collapse and fade. */
export function collapse(node: HTMLElement): TransitionConfig {
  const h = node.offsetHeight;
  return {
    duration: MEDIUM,
    easing: cubicIn,
    css: (t) => `height:${t * h}px; overflow:hidden; opacity:${t}`,
  };
}

/** Dialog / menu pop. */
export function pop(node: Element, { origin = 'center' }: { origin?: string } = {}): TransitionConfig {
  return {
    duration: FAST,
    easing: cubicOut,
    css: (t) => `opacity:${t}; transform: scale(${0.92 + 0.08 * t}); transform-origin:${origin}`,
  };
}

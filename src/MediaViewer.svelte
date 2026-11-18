<script lang="ts">
  import { fade } from 'svelte/transition';
  import { mdiChevronLeft, mdiChevronRight, mdiClose, mdiTrayArrowDown } from '@mdi/js';
  import type { Msg } from './lib/chatlist';
  import { displayFileName, fileUrl, isMedia, isVideo } from './lib/files';
  import { zoomFrom } from './lib/transitions';
  import Icon from './lib/Icon.svelte';

  let {
    message,
    index: startIndex,
    origin,
    onclose,
  }: { message: Msg; index: number; origin: DOMRect | null; onclose: () => void } = $props();

  const media = $derived((message.files ?? []).filter(isMedia));
  // Starts at the tapped item, then changes on swipe / arrows.
  // svelte-ignore state_referenced_locally
  let index = $state(startIndex);
  let chrome = $state(true); // top bar + caption visible
  let fullLoaded = $state<Record<string, boolean>>({});
  const current = $derived(media[index]);

  /** Rect of the bubble tile for the item now shown, so closing shrinks back into it. */
  function closeOrigin(): DOMRect | null {
    const el = document.querySelector(`[data-media-key="${CSS.escape(`${message.id}/${current}`)}"]`);
    return el?.getBoundingClientRect() ?? origin;
  }

  function go(delta: number) {
    index = (index + delta + media.length) % media.length;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowLeft' && media.length > 1) go(-1);
    else if (e.key === 'ArrowRight' && media.length > 1) go(1);
  }

  // Swipe left/right on touch screens.
  let swipeStart: { x: number; y: number } | null = null;
  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') swipeStart = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: PointerEvent) {
    if (!swipeStart || media.length < 2) return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" transition:fade={{ duration: 220 }}></div>

<div
  class="stage"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label={displayFileName(current)}
  in:zoomFrom={{ from: origin }}
  out:zoomFrom={{ from: closeOrigin(), duration: 200 }}
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
>
  {#key current}
    <div class="item" in:fade={{ duration: 150 }}>
      {#if isVideo(current)}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={fileUrl(message, current)} controls autoplay playsinline></video>
      {:else}
        <button class="img-btn" onclick={() => (chrome = !chrome)} aria-label="Toggle controls">
          <!-- Thumbnail (already cached) shows while the full image loads. -->
          {#if !fullLoaded[current]}
            <img class="thumb" src={fileUrl(message, current, { thumb: '480x0' })} alt="" />
            <span class="spinner loading"></span>
          {/if}
          <img
            class="full"
            class:ready={fullLoaded[current]}
            src={fileUrl(message, current)}
            alt={displayFileName(current)}
            onload={() => (fullLoaded[current] = true)}
          />
        </button>
      {/if}
    </div>
  {/key}

  {#if chrome}
    <header transition:fade={{ duration: 150 }}>
      <button class="icon-btn" onclick={onclose} title="Close (Esc)"><Icon path={mdiClose} /></button>
      <span class="title">
        {#if media.length > 1}{index + 1} / {media.length} · {/if}{displayFileName(current)}
      </span>
      <a class="icon-btn" href={fileUrl(message, current, { download: true })} download title="Download">
        <Icon path={mdiTrayArrowDown} />
      </a>
    </header>

    {#if media.length > 1}
      <button class="nav prev icon-btn" onclick={() => go(-1)} title="Previous (←)">
        <Icon path={mdiChevronLeft} size={32} />
      </button>
      <button class="nav next icon-btn" onclick={() => go(1)} title="Next (→)">
        <Icon path={mdiChevronRight} size={32} />
      </button>
    {/if}

    {#if message.text}
      <div class="caption" transition:fade={{ duration: 150 }}>{message.text}</div>
    {/if}
  {/if}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: #000;
  }
  .stage {
    position: fixed;
    inset: 0;
    z-index: 71;
    color: #fff;
    touch-action: pan-y pinch-zoom;
  }
  .item {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .item video {
    max-width: 100%;
    max-height: 100%;
    background: #000;
  }
  .img-btn {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }
  .img-btn img {
    grid-area: 1 / 1;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .thumb {
    width: 100%;
    height: 100%;
  }
  .full {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .full.ready {
    opacity: 1;
  }
  .loading {
    grid-area: 1 / 1;
  }
  header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    padding-top: calc(8px + env(safe-area-inset-top));
    background: rgb(0 0 0 / 0.55);
  }
  header a {
    color: inherit;
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 64px;
    background: rgb(0 0 0 / 0.35);
  }
  .prev {
    left: 8px;
  }
  .next {
    right: 8px;
  }
  .caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 30%;
    overflow: auto;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: rgb(0 0 0 / 0.55);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>

<script lang="ts">
  import { mdiChevronRight, mdiImageBrokenVariant, mdiPlayCircleOutline } from '@mdi/js';
  import type { Msg } from './lib/chatlist';
  import { DEVICE_NAME } from './lib/config';
  import {
    displayFileName,
    fetchFileMeta,
    fileExt,
    fileIcon,
    fileUrl,
    formatBytes,
    isMedia,
    isVideo,
  } from './lib/files';
  import { longpress } from './lib/actions';
  import Icon from './lib/Icon.svelte';

  let {
    message,
    onmenu,
    onopenmedia,
    onopenfile,
  }: {
    message: Msg;
    onmenu: (x: number, y: number) => void;
    onopenmedia: (index: number, origin: DOMRect) => void;
    onopenfile: (name: string, origin: DOMRect) => void;
  } = $props();

  const mine = $derived(message.device === DEVICE_NAME);
  const files = $derived(message.files ?? []);
  const media = $derived(files.filter(isMedia));
  const others = $derived(files.filter((f) => !isMedia(f)));
  const time = $derived.by(() => {
    const d = new Date(message.created.replace(' ', 'T'));
    return isNaN(+d) ? '' : d.toTimeString().slice(0, 5);
  });

  let broken = $state<Record<string, boolean>>({});

  const rectOf = (e: Event) => (e.currentTarget as HTMLElement).getBoundingClientRect();
</script>

<div class="row" class:mine>
  <div class="bubble" use:longpress={onmenu}>
    {#if media.length > 0}
      <div class="media" class:grid={media.length > 1}>
        {#each media as f, i (f)}
          <button
            class="tile"
            data-media-key="{message.id}/{f}"
            onclick={(e) => onopenmedia(i, rectOf(e))}
            aria-label="Open {displayFileName(f)}"
          >
            {#if isVideo(f)}
              <!-- First frame as a preview (#t= makes browsers seek a little). -->
              <video src="{fileUrl(message, f)}#t=0.1" preload="metadata" muted playsinline></video>
              <span class="play"><Icon path={mdiPlayCircleOutline} size={44} /></span>
            {:else if broken[f]}
              <span class="broken"><Icon path={mdiImageBrokenVariant} size={32} /></span>
            {:else}
              <!-- "480x0" thumb is declared on the files field in pb_schema.json. -->
              <img
                src={fileUrl(message, f, { thumb: '480x0' })}
                alt={displayFileName(f)}
                loading="lazy"
                onload={(e) => (e.currentTarget as HTMLElement).classList.add('loaded')}
                onerror={() => (broken[f] = true)}
              />
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    {#each others as f (f)}
      <button class="file" data-file-key="{message.id}/{f}" onclick={(e) => onopenfile(f, rectOf(e))}>
        <Icon path={fileIcon(f)} size={28} />
        <span class="file-text">
          <span class="file-name">{displayFileName(f)}</span>
          <span class="small">
            {fileExt(f).toUpperCase() || 'File'}
            {#await fetchFileMeta(fileUrl(message, f)) then meta}
              {#if meta.size !== null}· {formatBytes(meta.size)}{/if}
            {/await}
          </span>
        </span>
        <Icon path={mdiChevronRight} size={20} />
      </button>
    {/each}

    {#if message.text}
      <p class="text">{message.text}</p>
    {/if}

    <span class="meta small">{message.device} · {time}</span>
  </div>
</div>

<style>
  .row {
    display: flex;
    padding: 3px 8px;
  }
  .row.mine {
    justify-content: flex-end;
  }
  .bubble {
    max-width: min(78%, 560px);
    padding: 6px;
    border-radius: var(--radius);
    background: var(--surface-high);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .mine .bubble {
    background: var(--primary-container);
    color: var(--on-primary-container);
    align-items: flex-end;
  }
  /* Long-press opens the menu on touch screens; don't also start a text selection. */
  @media (pointer: coarse) {
    .bubble {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
  }

  .media {
    width: 240px;
    max-width: 100%;
  }
  .media.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .tile {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: calc(var(--radius) - 2px);
    overflow: hidden;
    background: rgb(0 0 0 / 0.25);
    min-height: 120px;
  }
  .grid .tile {
    aspect-ratio: 1;
    min-height: 0;
  }
  .tile img,
  .tile video {
    display: block;
    width: 100%;
    max-height: 320px;
    object-fit: cover;
  }
  .grid .tile img,
  .grid .tile video {
    height: 100%;
    max-height: none;
  }
  .tile img {
    opacity: 0;
    transition: opacity 0.18s;
  }
  .tile :global(img.loaded) {
    opacity: 1;
  }
  .play,
  .broken {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: rgb(255 255 255 / 0.8);
  }

  .file {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 240px;
    max-width: 100%;
    padding: 8px;
    border: 0;
    border-radius: var(--radius);
    background: rgb(0 0 0 / 0.2);
    text-align: left;
  }
  .file:hover {
    background: rgb(0 0 0 / 0.3);
  }
  .file-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .file-name {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .text {
    margin: 0;
    padding: 2px 4px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .small {
    font-size: 12px;
    opacity: 0.7;
  }
  .meta {
    padding: 0 4px;
  }
</style>

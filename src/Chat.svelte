<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { mdiContentCopy, mdiDeleteOutline, mdiLogout } from '@mdi/js';
  import { ChatStore } from './lib/chat.svelte';
  import type { Msg } from './lib/chatlist';
  import { fileUrl } from './lib/files';
  import { errorText, pb } from './lib/pb';
  import { toasts } from './lib/toast.svelte';
  import { collapse, entry } from './lib/transitions';
  import Icon from './lib/Icon.svelte';
  import MessageBubble from './MessageBubble.svelte';
  import Composer from './Composer.svelte';
  import ContextMenu, { type MenuItem } from './ContextMenu.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import MediaViewer from './MediaViewer.svelte';
  import FileViewer from './FileViewer.svelte';

  const chat = new ChatStore();

  let list: HTMLDivElement;
  let sentinel: HTMLDivElement;
  let composer: Composer;

  // Popup data is kept after closing (only the *Open flag flips), because a
  // closing component still reads its props during its out-transition.
  let menu = $state<{ x: number; y: number; items: MenuItem[] }>({ x: 0, y: 0, items: [] });
  let menuOpen = $state(false);
  let confirmMsg = $state<Msg | null>(null);
  let confirmOpen = $state(false);
  let mediaView = $state<{ message: Msg; index: number; origin: DOMRect } | null>(null);
  let mediaOpen = $state(false);
  let fileView = $state<{ message: Msg; name: string; origin: DOMRect } | null>(null);
  let fileOpen = $state(false);
  let dragging = $state(false);

  // Load older messages when the top of the list comes into view.
  let sentinelVisible = false;
  async function maybeLoadOlder() {
    while (sentinelVisible && chat.hasMore && !chat.loadingOlder) {
      const before = chat.messages.length;
      try {
        await chat.loadOlder();
      } catch (e) {
        toasts.show(`Could not load older messages: ${errorText(e)}`);
        return;
      }
      await tick();
      if (chat.messages.length === before) return; // nothing new; avoid spinning
    }
  }

  onMount(() => {
    chat.start();
    const io = new IntersectionObserver(
      ([e]) => {
        sentinelVisible = e.isIntersecting;
        maybeLoadOlder();
      },
      { root: list, rootMargin: '400px 0px 0px 0px' },
    );
    io.observe(sentinel);
    return () => {
      io.disconnect();
      chat.stop();
    };
  });

  async function send(
    text: string,
    files: File[],
    onProgress: (l: number, t: number) => void,
    signal: AbortSignal,
  ) {
    await chat.send(text, files, onProgress, signal);
    await tick();
    list.scrollTo({ top: 0, behavior: 'smooth' }); // column-reverse: 0 = bottom
  }

  function openMenu(m: Msg, x: number, y: number) {
    const hasText = !!m.text;
    menu = {
      x,
      y,
      items: [
        {
          label: hasText ? 'Copy text' : 'Copy file link(s)',
          icon: mdiContentCopy,
          action: async () => {
            const value = hasText ? m.text! : (m.files ?? []).map((f) => fileUrl(m, f)).join('\n');
            try {
              await navigator.clipboard.writeText(value);
              toasts.show('Copied');
            } catch {
              toasts.show('Could not copy (clipboard needs https)');
            }
          },
        },
        {
          label: 'Delete',
          icon: mdiDeleteOutline,
          action: () => {
            confirmMsg = m;
            confirmOpen = true;
          },
        },
      ],
    };
    menuOpen = true;
  }

  async function doDelete() {
    const m = confirmMsg;
    confirmOpen = false;
    if (!m) return;
    try {
      await chat.delete(m);
    } catch (e) {
      toasts.show(`Delete failed: ${errorText(e)}`);
    }
  }

  async function logout() {
    chat.stop();
    pb.authStore.clear(); // App.svelte swaps back to the login screen
  }

  // Drag & drop files anywhere on the chat.
  let dragDepth = 0;
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;
  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    dragDepth++;
    dragging = true;
  }
  function onDragLeave() {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      dragging = false;
    }
  }
  function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dragging = false;
    if (e.dataTransfer?.files.length) composer.addFiles(e.dataTransfer.files);
  }
</script>

<div
  class="chat"
  role="region"
  aria-label="Chat"
  ondragenter={onDragEnter}
  ondragleave={onDragLeave}
  ondragover={(e) => hasFiles(e) && e.preventDefault()}
  ondrop={onDrop}
>
  <header>
    <h1>ft-chat</h1>
    <span
      class="dot"
      class:on={chat.connected}
      title={chat.connected ? 'Live' : 'Offline'}
      aria-label={chat.connected ? 'Live' : 'Offline'}
    ></span>
    <button class="icon-btn" onclick={logout} title="Log out"><Icon path={mdiLogout} /></button>
  </header>

  <!-- column-reverse: newest at the bottom, scrollTop 0 = bottom, and pages of
       older messages append at the top without moving what you're reading. -->
  <div class="list" bind:this={list}>
    {#each chat.messages as m (m.id)}
      <div class="item" in:entry={{ enabled: chat.appearing.has(m.id) }} out:collapse>
        <MessageBubble
          message={m}
          onmenu={(x, y) => openMenu(m, x, y)}
          onopenmedia={(index, origin) => {
            mediaView = { message: m, index, origin };
            mediaOpen = true;
          }}
          onopenfile={(name, origin) => {
            fileView = { message: m, name, origin };
            fileOpen = true;
          }}
        />
      </div>
    {/each}

    <div class="top" bind:this={sentinel}>
      {#if chat.loadingOlder}
        <span class="spinner"></span>
      {:else if !chat.hasMore && chat.messages.length > 0}
        <span class="small">Start of history</span>
      {/if}
    </div>

    {#if chat.initialLoading}
      <div class="center" out:fade={{ duration: 150 }}><span class="spinner"></span></div>
    {:else if chat.messages.length === 0}
      <div class="center" in:fade={{ duration: 200 }}>
        <p>{chat.error ?? 'No messages yet.'}</p>
        {#if chat.error}<button class="btn" onclick={() => chat.connect()}>Retry</button>{/if}
      </div>
    {/if}
  </div>

  <Composer bind:this={composer} onsend={send} />

  {#if dragging}
    <div class="drop" transition:fade={{ duration: 120 }}>Drop files to attach</div>
  {/if}
</div>

{#if menuOpen}
  <ContextMenu x={menu.x} y={menu.y} items={menu.items} onclose={() => (menuOpen = false)} />
{/if}

{#if confirmOpen && confirmMsg}
  <ConfirmDialog
    title="Delete message?"
    message={confirmMsg.files?.length
      ? `This removes it and its ${confirmMsg.files.length} file(s) from all devices.`
      : 'This removes it from all devices.'}
    confirmLabel="Delete"
    onconfirm={doDelete}
    oncancel={() => (confirmOpen = false)}
  />
{/if}

{#if mediaOpen && mediaView}
  <MediaViewer
    message={mediaView.message}
    index={mediaView.index}
    origin={mediaView.origin}
    onclose={() => (mediaOpen = false)}
  />
{/if}

{#if fileOpen && fileView}
  <FileViewer
    message={fileView.message}
    name={fileView.name}
    origin={fileView.origin}
    onclose={() => (fileOpen = false)}
  />
{/if}

<style>
  .chat {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 8px 0 16px;
    padding-top: env(safe-area-inset-top);
    background: var(--surface);
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--muted);
    transition: background 0.3s;
  }
  .dot.on {
    background: var(--ok);
  }
  .list {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column-reverse;
    padding: 8px 0;
    overscroll-behavior: contain;
  }
  .top {
    display: grid;
    place-items: center;
    min-height: 40px;
    padding: 8px;
  }
  .small {
    font-size: 12px;
    color: var(--muted);
  }
  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--muted);
  }
  .center p {
    margin: 0;
  }
  .drop {
    position: absolute;
    inset: 8px;
    z-index: 40;
    display: grid;
    place-items: center;
    border: 2px dashed var(--primary);
    border-radius: var(--radius);
    background: rgb(17 19 24 / 0.85);
    color: var(--primary);
    font-size: 18px;
    pointer-events: none;
  }
</style>

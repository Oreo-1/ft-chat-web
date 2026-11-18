<script lang="ts">
  import { fade } from 'svelte/transition';
  import { mdiClose, mdiLink, mdiTrayArrowDown } from '@mdi/js';
  import type { Msg } from './lib/chatlist';
  import { displayFileName, fetchFileMeta, fileExt, fileIcon, fileUrl, formatBytes } from './lib/files';
  import { zoomFrom } from './lib/transitions';
  import { toasts } from './lib/toast.svelte';
  import Icon from './lib/Icon.svelte';

  let {
    message,
    name,
    origin,
    onclose,
  }: { message: Msg; name: string; origin: DOMRect | null; onclose: () => void } = $props();

  const url = $derived(fileUrl(message, name));
  const ext = $derived(fileExt(name));
  const sentLocal = $derived.by(() => {
    const d = new Date(message.created.replace(' ', 'T'));
    return isNaN(+d) ? message.created : d.toLocaleString();
  });

  function closeOrigin(): DOMRect | null {
    const el = document.querySelector(`[data-file-key="${CSS.escape(`${message.id}/${name}`)}"]`);
    return el?.getBoundingClientRect() ?? origin;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toasts.show('Link copied');
    } catch {
      toasts.show('Could not copy (clipboard needs https)');
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="scrim" role="presentation" onclick={onclose} transition:fade={{ duration: 200 }}></div>
<div class="wrap">
  <div
    class="card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="file-title"
    in:zoomFrom={{ from: origin }}
    out:zoomFrom={{ from: closeOrigin(), duration: 200 }}
  >
    <div class="head">
      <span class="big-icon"><Icon path={fileIcon(name)} size={56} /></span>
      <h2 id="file-title">{displayFileName(name)}</h2>
      <button class="icon-btn" onclick={onclose} title="Close (Esc)"><Icon path={mdiClose} /></button>
    </div>

    <!-- Metadata only; the file's contents are never shown here. -->
    <dl>
      <dt>Type</dt>
      <dd>{ext ? `${ext.toUpperCase()} file` : 'File'}</dd>
      {#await fetchFileMeta(url)}
        <dt>MIME type</dt><dd>…</dd>
        <dt>Size</dt><dd>…</dd>
      {:then meta}
        <dt>MIME type</dt><dd>{meta.type ?? 'Unknown'}</dd>
        <dt>Size</dt>
        <dd>
          {meta.size !== null ? `${formatBytes(meta.size)}  (${meta.size.toLocaleString()} bytes)` : 'Unknown'}
        </dd>
      {/await}
      <dt>Sent from</dt>
      <dd>{message.device}</dd>
      <dt>Sent</dt>
      <dd>{sentLocal}</dd>
      <dt>Stored as</dt>
      <dd class="mono">{name}</dd>
    </dl>

    <div class="actions">
      <button class="btn" onclick={copyLink}><Icon path={mdiLink} size={18} />Copy link</button>
      <!-- ?download=1 makes PocketBase send it as an attachment -> browser download. -->
      <a class="btn filled" href={fileUrl(message, name, { download: true })} download>
        <Icon path={mdiTrayArrowDown} size={18} />Download
      </a>
    </div>
  </div>
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    z-index: 51;
    display: grid;
    place-items: center;
    padding: 16px;
    pointer-events: none;
  }
  .card {
    pointer-events: auto;
    width: min(380px, 100%);
    padding: 12px 12px 16px 20px;
    border-radius: var(--radius);
    background: var(--surface-high);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.5);
  }
  .head {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .big-icon {
    margin-top: 8px;
    color: var(--primary);
  }
  h2 {
    flex: 1;
    min-width: 0;
    margin: 8px 0 0;
    font-size: 17px;
    font-weight: 500;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  dl {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 8px;
    margin: 0 8px 16px 0;
  }
  dt {
    color: var(--muted);
    font-size: 13px;
  }
  dd {
    margin: 0;
    word-break: break-all;
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .actions a {
    text-decoration: none;
  }
</style>

<script lang="ts">
  import { fade } from 'svelte/transition';
  import { pop } from './lib/transitions';

  let {
    title,
    message,
    confirmLabel = 'OK',
    onconfirm,
    oncancel,
  }: {
    title: string;
    message: string;
    confirmLabel?: string;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') oncancel();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="scrim" role="presentation" onclick={oncancel} transition:fade={{ duration: 180 }}></div>
<div class="wrap">
  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" transition:pop>
    <h2 id="dlg-title">{title}</h2>
    <p>{message}</p>
    <div class="actions">
      <button class="btn" onclick={oncancel}>Cancel</button>
      <!-- svelte-ignore a11y_autofocus -->
      <button class="btn" onclick={onconfirm} autofocus>{confirmLabel}</button>
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
  .dialog {
    pointer-events: auto;
    width: min(360px, 100%);
    padding: 20px 20px 12px;
    border-radius: var(--radius);
    background: var(--surface-high);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.5);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 500;
  }
  p {
    margin: 0 0 16px;
    color: var(--muted);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
  }
</style>

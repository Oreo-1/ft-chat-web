<script lang="ts">
  import { slide } from 'svelte/transition';
  import { mdiClose, mdiPaperclip, mdiSend } from '@mdi/js';
  import { MAX_UPLOAD_BYTES } from './lib/config';
  import { formatBytes } from './lib/files';
  import { errorText } from './lib/pb';
  import { toasts } from './lib/toast.svelte';
  import Icon from './lib/Icon.svelte';

  let {
    onsend,
  }: {
    onsend: (
      text: string,
      files: File[],
      onProgress: (loaded: number, total: number) => void,
      signal: AbortSignal,
    ) => Promise<void>;
  } = $props();

  let text = $state('');
  let files = $state<File[]>([]);
  let sending = $state(false);
  let progress = $state<{ loaded: number; total: number } | null>(null);
  let abort: AbortController | null = null;

  let textarea: HTMLTextAreaElement;
  let picker: HTMLInputElement;

  const canSend = $derived(!sending && (text.trim().length > 0 || files.length > 0));
  const totalBytes = $derived(files.reduce((n, f) => n + f.size, 0));
  // Touch devices: Enter = new line (send with the button), like phone chat apps.
  const enterSends = !window.matchMedia('(pointer: coarse)').matches;

  /** Add files (picker, paste, drag & drop), respecting the upload limit. */
  export function addFiles(list: Iterable<File>) {
    let total = totalBytes + text.length;
    let skipped = 0;
    const next = [...files];
    for (const f of list) {
      if (total + f.size > MAX_UPLOAD_BYTES) {
        skipped++;
        continue;
      }
      total += f.size;
      next.push(f);
    }
    files = next;
    if (skipped > 0) {
      toasts.show(
        `${skipped} file(s) skipped: one message is limited to ${formatBytes(MAX_UPLOAD_BYTES)} (Cloudflare tunnel limit).`,
        5000,
      );
    }
    textarea?.focus();
  }

  function onPick() {
    if (picker.files) addFiles(picker.files);
    picker.value = '';
  }

  function onPaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.files;
    if (pasted && pasted.length > 0) {
      e.preventDefault();
      addFiles(pasted);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (enterSends && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  }

  // Grow the textarea with its content (up to ~6 lines, then scroll).
  function autosize() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }
  $effect(() => {
    text; // re-run when text changes (incl. clearing after send)
    autosize();
  });

  async function send() {
    if (!canSend) return;
    sending = true;
    progress = files.length > 0 ? { loaded: 0, total: totalBytes } : null;
    abort = new AbortController();
    try {
      await onsend(
        text.trim(),
        files,
        (loaded, total) => files.length > 0 && (progress = { loaded, total }),
        abort.signal,
      );
      text = '';
      files = [];
    } catch (err) {
      const e = err as { status?: number; isAbort?: boolean };
      if (!e.isAbort) toasts.show(`Send failed: ${e.status === 413 ? 'too large (413)' : errorText(err)}`);
    } finally {
      sending = false;
      progress = null;
      abort = null;
      queueMicrotask(() => textarea?.focus());
    }
  }
</script>

<footer>
  {#if files.length > 0}
    <div class="chips" transition:slide={{ duration: 180 }}>
      {#each files as f, i (f)}
        <span class="chip" transition:slide={{ axis: 'x', duration: 150 }}>
          <span class="chip-name">{f.name}</span>
          <span class="chip-size">{formatBytes(f.size)}</span>
          <button
            class="chip-x"
            disabled={sending}
            onclick={() => (files = files.filter((_, j) => j !== i))}
            aria-label="Remove {f.name}"
          >
            <Icon path={mdiClose} size={16} />
          </button>
        </span>
      {/each}
    </div>
  {/if}

  {#if progress}
    <div class="progress" transition:slide={{ duration: 150 }}>
      <div class="bar"><div style:width="{(progress.loaded / Math.max(progress.total, 1)) * 100}%"></div></div>
      <span class="small">{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
      <button class="btn" onclick={() => abort?.abort()}>Cancel</button>
    </div>
  {/if}

  <div class="bar-row">
    <div class="input">
      <button class="icon-btn" onclick={() => picker.click()} disabled={sending} title="Attach files">
        <Icon path={mdiPaperclip} />
      </button>
      <input bind:this={picker} type="file" multiple hidden onchange={onPick} />
      <textarea
        bind:this={textarea}
        bind:value={text}
        rows="1"
        placeholder="Message"
        disabled={sending}
        onkeydown={onKeydown}
        onpaste={onPaste}
      ></textarea>
    </div>
    <button class="send" onclick={send} disabled={!canSend} title="Send">
      {#if sending}<span class="spinner"></span>{:else}<Icon path={mdiSend} />{/if}
    </button>
  </div>
</footer>

<style>
  footer {
    flex: none;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 4px 4px 4px 10px;
    border: 1px solid var(--outline);
    border-radius: var(--radius);
    font-size: 13px;
  }
  .chip-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }
  .chip-size {
    color: var(--muted);
  }
  .chip-x {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
  }
  .progress {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .progress .bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--surface-highest);
    overflow: hidden;
  }
  .progress .bar div {
    height: 100%;
    background: var(--primary);
    transition: width 0.1s linear;
  }
  .small {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }
  .bar-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  /* Chat-style input box: attach button + growing textarea */
  .input {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-end;
    border-radius: var(--radius);
    background: var(--surface-highest);
    padding: 4px;
  }
  textarea {
    flex: 1;
    min-width: 0;
    resize: none;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 16px;
    line-height: 22px;
    padding: 9px 8px 9px 4px;
    max-height: 160px;
  }
  .send {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: var(--radius);
    background: var(--primary);
    color: var(--on-primary);
    transition: opacity 0.15s, transform 0.15s;
  }
  .send:disabled {
    opacity: 0.35;
  }
  .send:active:not(:disabled) {
    transform: scale(0.94);
  }
</style>

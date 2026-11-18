<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toasts } from './lib/toast.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div class="toast" transition:fly={{ y: 16, duration: 180 }}>{t.text}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: 88px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 100;
    width: min(480px, calc(100% - 32px));
    pointer-events: none;
  }
  .toast {
    padding: 12px 16px;
    border-radius: var(--radius);
    background: var(--surface-highest);
    color: var(--text);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.4);
  }
</style>

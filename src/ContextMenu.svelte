<script lang="ts" module>
  export interface MenuItem {
    label: string;
    icon: string;
    action: () => void;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { pop } from './lib/transitions';
  import Icon from './lib/Icon.svelte';

  let { x, y, items, onclose }: { x: number; y: number; items: MenuItem[]; onclose: () => void } =
    $props();

  let el: HTMLDivElement;
  // Initial position only; adjusted once on mount to stay on screen.
  // svelte-ignore state_referenced_locally
  let pos = $state({ left: x, top: y });
  let origin = $state('top left');

  // Keep the menu on screen; open toward the side with room.
  onMount(() => {
    const r = el.getBoundingClientRect();
    const flipX = x + r.width > window.innerWidth - 8;
    const flipY = y + r.height > window.innerHeight - 8;
    pos = { left: flipX ? Math.max(8, x - r.width) : x, top: flipY ? Math.max(8, y - r.height) : y };
    origin = `${flipY ? 'bottom' : 'top'} ${flipX ? 'right' : 'left'}`;
    el.querySelector('button')?.focus();
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} onresize={onclose} />

<!-- Invisible full-screen layer: any click outside closes the menu. -->
<div
  class="layer"
  role="presentation"
  onclick={onclose}
  oncontextmenu={(e) => {
    e.preventDefault();
    onclose();
  }}
></div>
<div
  bind:this={el}
  class="menu"
  role="menu"
  style:left="{pos.left}px"
  style:top="{pos.top}px"
  transition:pop={{ origin }}
>
  {#each items as item (item.label)}
    <button
      role="menuitem"
      onclick={() => {
        onclose();
        item.action();
      }}
    >
      <Icon path={item.icon} size={20} />
      {item.label}
    </button>
  {/each}
</div>

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 60;
  }
  .menu {
    position: fixed;
    z-index: 61;
    min-width: 180px;
    padding: 4px 0;
    border-radius: var(--radius);
    background: var(--surface-highest);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.45);
  }
  button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    text-align: left;
  }
  button:hover,
  button:focus-visible {
    background: rgb(255 255 255 / 0.08);
    outline: none;
  }
</style>

<script lang="ts">
  /** Inline SVG icon from an @mdi/js path string. */
  let { path, size = 24, title }: { path: string; size?: number; title?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
>
  {#if title}<title>{title}</title>{/if}
  <path d={path} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>

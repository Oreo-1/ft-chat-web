import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths, so the build works from any folder
  // (e.g. PocketBase's pb_public, or a subpath on your server).
  base: './',
});

<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { pb, refreshAuth } from './lib/pb';
  import Login from './Login.svelte';
  import Chat from './Chat.svelte';
  import Toasts from './Toasts.svelte';

  let loggedIn = $state(pb.authStore.isValid);

  onMount(() => {
    refreshAuth();
    // Login, logout, token refresh, or the SDK clearing an expired token.
    return pb.authStore.onChange(() => {
      loggedIn = pb.authStore.isValid;
    });
  });
</script>

<!-- Login <-> chat: fade + slight upward slide -->
{#key loggedIn}
  <div class="screen" in:fly={{ y: 16, duration: 280, easing: cubicOut }} out:fade={{ duration: 160 }}>
    {#if loggedIn}
      <Chat />
    {:else}
      <Login />
    {/if}
  </div>
{/key}

<Toasts />

<style>
  .screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }
</style>

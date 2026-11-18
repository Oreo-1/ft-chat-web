<script lang="ts">
  import { slide } from 'svelte/transition';
  import { mdiAccountOutline, mdiLockOutline } from '@mdi/js';
  import { pb } from './lib/pb';
  import { USERS_COLLECTION } from './lib/config';
  import Icon from './lib/Icon.svelte';

  let username = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function login(e: SubmitEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    busy = true;
    error = null;
    try {
      await pb.collection(USERS_COLLECTION).authWithPassword(username.trim(), password);
      // App.svelte reacts to the auth store change and swaps to the chat.
    } catch (err) {
      const e = err as { status?: number; response?: { message?: string } };
      error =
        e.status === 400
          ? 'Invalid username or password.'
          : `Login failed (${e.status ?? '?'}): ${e.response?.message ?? 'network error'}`;
    } finally {
      busy = false;
    }
  }
</script>

<main>
  <form onsubmit={login}>
    <h1>ft-chat</h1>

    <label class="field">
      <Icon path={mdiAccountOutline} size={20} />
      <input
        bind:value={username}
        placeholder="Username"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        required
      />
    </label>

    <label class="field">
      <Icon path={mdiLockOutline} size={20} />
      <input
        bind:value={password}
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        required
      />
    </label>

    {#if error}
      <p class="error" transition:slide={{ duration: 180 }}>{error}</p>
    {/if}

    <button class="btn filled submit" disabled={busy}>
      {#if busy}<span class="spinner"></span>{:else}Log in{/if}
    </button>
  </form>
</main>

<style>
  main {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 24px 16px;
    overflow: auto;
  }
  form {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h1 {
    margin: 0 0 20px;
    text-align: center;
    font-weight: 500;
    font-size: 28px;
  }
  /* Bordered inputs */
  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border: 1px solid var(--outline);
    border-radius: var(--radius);
    color: var(--muted);
    transition: border-color 0.15s;
  }
  .field:focus-within {
    border-color: var(--primary);
    box-shadow: inset 0 0 0 1px var(--primary);
  }
  input {
    flex: 1;
    min-width: 0;
    height: 48px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 16px; /* avoids iOS zoom-on-focus */
  }
  .error {
    margin: 0;
    color: var(--error);
  }
  .submit {
    margin-top: 12px;
    height: 48px;
  }
</style>

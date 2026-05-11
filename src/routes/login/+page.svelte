<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { ActionData } from './$types';
  import { toastStore } from '$lib/stores/toast.svelte';

  export let form: ActionData;
  let busy = false;
  let showPassword = false;
  let lastFormMessage = '';
  $: storeName = $page.data.storeName ?? 'hot&Cold';
  $: logoUrl = $page.data.logoUrl ?? '';
  $: if (form?.message && form.message !== lastFormMessage) {
    lastFormMessage = form.message;
    toastStore.error(form.message);
  }
</script>

<svelte:head>
  <title>Login | {storeName}</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-primary/10">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
        {#if logoUrl && logoUrl.length > 0}
          <img src={logoUrl} alt="Logo" class="h-14 w-14 object-contain" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
        {/if}
        <span class="material-symbols-outlined text-4xl" class:hidden={logoUrl && logoUrl.length > 0}>bakery_dining</span>
      </div>
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">{storeName}</h1>
      <p class="text-slate-500 mt-1">Sign in to continue</p>
    </div>

    {#if form?.message}
      <div class="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-200">
        {form.message}
      </div>
    {/if}

    <form method="POST" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; update(); }; }} class="space-y-4">
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1" for="username">Username</label>
        <input 
          name="username" 
          type="text" 
          required 
          class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="admin, cashier1..."
        />
      </div>
      
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-1" for="password">Password</label>
        <div class="relative">
          <input 
            name="password" 
            type={showPassword ? 'text' : 'password'}
            required 
            class="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onclick={() => (showPassword = !showPassword)}
          >
            <span class="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        <p class="mt-2 text-xs text-slate-400">Default password for seeded accounts is <code>password123</code></p>
      </div>

      <button 
        type="submit" 
        disabled={busy}
        class="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] mt-6"
      >
        {busy ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  </div>
</main>

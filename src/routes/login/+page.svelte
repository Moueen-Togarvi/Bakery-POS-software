<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  export let form: ActionData;
  let busy = false;
</script>

<svelte:head>
  <title>Login | OvenFresh POS</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-primary/10">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
        <span class="material-symbols-outlined text-3xl">local_cafe</span>
      </div>
      <h1 class="text-2xl font-bold text-slate-900">OvenFresh POS</h1>
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
        <input 
          name="password" 
          type="password" 
          required 
          class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="••••••••"
        />
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

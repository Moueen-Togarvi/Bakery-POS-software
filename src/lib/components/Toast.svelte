<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte';
  import { flip } from 'svelte/animate';
  import { fade, fly } from 'svelte/transition';
</script>

<div class="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-3 pointer-events-none">
  {#each toastStore.toasts as toast (toast.id)}
    <div
      animate:flip={{ duration: 300 }}
      in:fly={{ y: 20, duration: 400, opacity: 0 }}
      out:fade={{ duration: 200 }}
      class="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/90 px-5 py-3 text-white shadow-2xl backdrop-blur-xl"
    >
      {#if toast.type === 'success'}
        <span class="material-symbols-outlined text-emerald-400">check_circle</span>
      {:else if toast.type === 'error'}
        <span class="material-symbols-outlined text-rose-400">error</span>
      {:else}
        <span class="material-symbols-outlined text-sky-400">info</span>
      {/if}
      
      <span class="text-sm font-bold tracking-tight">{toast.message}</span>
      
      <button 
        class="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        on:click={() => toastStore.remove(toast.id)}
      >
        <span class="material-symbols-outlined text-xs">close</span>
      </button>
    </div>
  {/each}
</div>

<style>
  /* Ensure icons are available */
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
</style>

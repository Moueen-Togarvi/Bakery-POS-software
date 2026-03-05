<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte';
  import { flip } from 'svelte/animate';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';

  // Custom springy-like easing for entrance from right
  function springy(node: any, { duration = 800, x = 150, y = 0, delay = 0 } = {}) {
    return {
      duration,
      delay,
      css: (t: number) => {
        const eased = elasticOut(t);
        return `
          opacity: ${t};
          transform: translateX(${(1 - eased) * x}px) translateY(${(1 - eased) * y}px) scale(${0.9 + 0.1 * eased});
        `;
      }
    };
  }
</script>

<div class="fixed top-6 right-6 z-[1000] flex flex-col gap-4 pointer-events-none">
  {#each toastStore.toasts as toast (toast.id)}
    <div
      animate:flip={{ duration: 300 }}
      in:springy={{ duration: 800, x: 50, y: 0 }}
      out:fade={{ duration: 300, easing: cubicOut }}
      class="pointer-events-auto flex items-center gap-4 rounded-[50px] border border-emerald-200 bg-emerald-50/95 backdrop-blur-md px-5 py-3.5 shadow-[0_20px_40px_rgba(16,185,129,0.1),0_1px_3px_rgba(0,0,0,0.05)] min-w-[320px]"
    >
      <div class="check-icon">
        <svg class="check-svg" viewBox="0 0 24 24" fill="none">
          <circle class="check-circle" cx="12" cy="12" r="11" stroke={toast.type === 'success' ? "#22c55e" : "#f43f5e"} stroke-width="2.5" stroke-linecap="round"/>
          {#if toast.type === 'success'}
            <path class="check-path" d="M7 12.5L10.5 16L17 8" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          {:else}
            <path class="check-path" d="M8 8L16 16M16 8L8 16" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          {/if}
        </svg>
      </div>
      
      <div class="flex-1 flex flex-col">
        <span class="text-[16px] font-bold text-[#4a2b18] leading-tight tracking-tight">{toast.message}</span>
        {#if toast.subMessage}
          <span class="text-[14px] font-medium text-[#8b5a2b] mt-0.5">{toast.subMessage}</span>
        {/if}
      </div>

      <button 
        class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        onclick={() => toastStore.remove(toast.id)}
      >
        <span class="material-symbols-outlined text-[18px] text-slate-500">close</span>
      </button>
    </div>
  {/each}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  .check-icon {
    width: 36px;
    height: 36px;
    background: #eaf8f0;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 10px rgba(34, 197, 94, 0.2);
    flex-shrink: 0;
  }

  .check-svg {
    width: 20px;
    height: 20px;
  }

  .check-circle {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: drawCircle 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    animation-delay: 0.3s;
  }

  .check-path {
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: drawPath 0.4s ease-out forwards;
    animation-delay: 0.7s;
  }

  @keyframes drawCircle {
    to { stroke-dashoffset: 0; }
  }

  @keyframes drawPath {
    to { stroke-dashoffset: 0; }
  }
</style>

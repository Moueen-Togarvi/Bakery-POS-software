<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';

  export let data: PageData;
</script>

<svelte:head>
  <title>Reports | OvenFresh POS</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <section class="space-y-5">
    <div class="rounded-2xl bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-slate-900">Reports Dashboard</h2>
        <span class={`rounded-full px-3 py-1 text-xs font-semibold ${data.dbOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          {data.dbOffline ? 'Sample Mode' : 'Live Mode'}
        </span>
      </div>
      {#if data.dbOffline}
        <div class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{data.dbMessage}</div>
      {/if}
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Active Products</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.totalProducts}</p>
      </article>
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Current Order Value</p>
        <p class="mt-2 text-3xl font-bold text-primary">{formatCurrency(data.orderValue)}</p>
      </article>
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Units In Cart</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.totalUnitsInCart}</p>
      </article>
    </div>

    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <h3 class="mb-4 text-lg font-bold text-slate-900">Top Items (Current Order)</h3>
      <div class="space-y-3">
        {#each data.topItems as item}
          <article class="flex items-center justify-between rounded-lg border border-primary/10 p-3">
            <div>
              <p class="font-semibold text-slate-900">{item.name}</p>
              <p class="text-xs text-slate-500">Qty: {item.quantity}</p>
            </div>
            <p class="font-bold text-primary">{formatCurrency(item.lineTotal)}</p>
          </article>
        {/each}
      </div>
    </section>
  </section>
</main>

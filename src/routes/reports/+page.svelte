<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { fade, fly } from 'svelte/transition';

  let { data } = $props();
  const storeName = $derived(data.storeName ?? 'Satluj Solar');

  let searchQuery = $state($page.url.searchParams.get('search') || '');
  let period = $state((data.period || 'daily') as 'daily' | 'weekly' | 'monthly' | 'custom');
  let baseDate = $state(data.baseDate || '');
  let dateFrom = $state(data.dateFrom || '');
  let dateTo = $state(data.dateTo || '');
  let busy = $state(false);
  let infoMessage = $state('');

  function handleSearch() {
    const url = new URL($page.url);
    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    } else {
      url.searchParams.delete('search');
    }
    url.searchParams.set('period', period);
    if (baseDate) url.searchParams.set('baseDate', baseDate);
    else url.searchParams.delete('baseDate');
    if (period === 'custom' && dateFrom) url.searchParams.set('from', dateFrom);
    else url.searchParams.delete('from');
    if (period === 'custom' && dateTo) url.searchParams.set('to', dateTo);
    else url.searchParams.delete('to');
    goto(url.toString(), { keepFocus: true });
  }

  let orderToReturn = $state<number | null>(null);
  let showReturnModal = $state(false);

  function openReturnConfirm(orderId: number) {
    orderToReturn = orderId;
    showReturnModal = true;
  }

  async function performReturnOrder() {
    if (!orderToReturn) return;

    busy = true;
    try {
      const res = await fetch('/api/reports/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderToReturn })
      });
      const body = await res.json();
      if (!res.ok) {
        toastStore.error(body.message ?? 'Return failed.');
        return;
      }
      toastStore.success('Order returned successfully.');
      showReturnModal = false;
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function printInvoice(orderId: number) {
    busy = true;
    try {
      const res = await fetch(`/api/reports/receipt?orderId=${orderId}`);
      const body = await res.json();
      if (!res.ok) {
        infoMessage = body.message ?? 'Failed to fetch invoice.';
        return;
      }
      
      const receipt = body.receipt;
      const lineRows = receipt.items
        .map(
          (item: any) =>
            `<tr><td style="padding:6px 0;">${item.name}${item.flavor ? ` (${item.flavor})` : ''} x${item.quantity}</td><td style="text-align:right;">${formatCurrency(item.lineTotal)}</td></tr>`
        )
        .join('');

      const html = `<!doctype html>
<html>
  <head>
    <title>${receipt.receiptNo}</title>
    <style>
      @page { margin: 0; size: 58mm auto; }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 14px; 
        margin: 0; 
        padding: 4mm 2mm; 
        width: 54mm; 
        color: #000; 
        line-height: 1.1;
      }
      h2 { margin: 0 0 8px; font-size: 16px; text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; }
      p { margin: 1px 0; }
      table { width: 100%; border-collapse: collapse; margin: 4px 0; }
      td, th { padding: 3px 0; text-align: left; vertical-align: top; }
      .right { text-align: right; white-space: nowrap; }
      .item-name { padding-right: 4px; }
      .totals { width: 100%; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
      .totals td { padding: 1px 0; font-size: 13px; }
      .grand-total { border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; font-weight: 900; font-size: 16px; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      .center { text-align: center; }
      .small { font-size: 11px; color: #444; }
    </style>
  </head>
  <body>
    <h2>${storeName}</h2>
    <div class="small center">
      <p>Receipt: ${receipt.receiptNo}</p>
      <p>${new Date(receipt.issuedAt).toLocaleString()}</p>
    </div>
    <hr />
    <table>${lineRows}</table>
    <div class="totals">
      <table>
        <tr><td>Subtotal:</td><td class="right">${formatCurrency(receipt.subtotal)}</td></tr>
        <tr><td>Tax:</td><td class="right">${formatCurrency(receipt.tax)}</td></tr>
        <tr class="grand-total"><td class="bold">TOTAL:</td><td class="right bold">${formatCurrency(receipt.total)}</td></tr>
      </table>
    </div>
    <hr />
    <p class="small center">Payment Method: ${receipt.paymentMethod}</p>
    <p class="center" style="margin-top: 10px; font-weight: bold;">THANK YOU!</p>
  </body>
</html>`;

      receiptHtml = html;
      showReceipt = true;
    } finally {
      busy = false;
    }
  }

  let showReceipt = $state(false);
  let receiptHtml = $state('');

  function triggerPrint() {
    const iframe = document.getElementById('receiptFrame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  }
</script>

<svelte:head>
  <title>Reports | {storeName}</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <section class="space-y-5">
    <div class="rounded-2xl bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-slate-900">Reports Dashboard</h2>
      </div>
      {#if data.dbOffline}
        <div class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{data.dbMessage}</div>
      {/if}
      {#if infoMessage}
        <div class="mt-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">{infoMessage}</div>
      {/if}
      
      <div class="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_auto]">
        <select class="rounded-lg border border-primary/20 px-3 py-2 text-sm" bind:value={period}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Range</option>
        </select>
        {#if period === 'custom'}
          <div class="grid grid-cols-2 gap-3">
            <input class="rounded-lg border border-primary/20 px-3 py-2 text-sm" type="date" bind:value={dateFrom} />
            <input class="rounded-lg border border-primary/20 px-3 py-2 text-sm" type="date" bind:value={dateTo} />
          </div>
        {:else}
          <input class="rounded-lg border border-primary/20 px-3 py-2 text-sm" type="date" bind:value={baseDate} />
        {/if}
        <input
          class="w-full rounded-lg border border-primary/20 px-4 py-2"
          placeholder="Search by Order ID, Customer, or Status..."
          bind:value={searchQuery}
          onkeydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button class="rounded-lg bg-primary px-8 py-3.5 font-bold text-white transition-all shadow-lg shadow-primary/20 active:scale-95" onclick={handleSearch}>
          Search
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
          <span class="material-symbols-outlined text-primary text-lg">shopping_basket</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-slate-900">{data.totalOrders}</p>
        <p class="mt-1 text-xs text-slate-500">Across all time</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Revenue</p>
          <span class="material-symbols-outlined text-emerald-500 text-lg">payments</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-emerald-600">{formatCurrency(data.totalRevenue)}</p>
        <p class="mt-1 text-xs text-slate-500">Sales amount</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cost</p>
          <span class="material-symbols-outlined text-rose-500 text-lg">payments</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-rose-600">{formatCurrency(data.totalCost)}</p>
        <p class="mt-1 text-xs text-slate-500">Purchase cost</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Profit</p>
          <span class="material-symbols-outlined text-emerald-500 text-lg">trending_up</span>
        </div>
        <p class="mt-3 text-2xl font-bold {data.grossProfit < 0 ? 'text-red-600' : 'text-emerald-600'}">{formatCurrency(data.grossProfit)}</p>
        <p class="mt-1 text-xs text-slate-500">Selling - Buying</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit Margin</p>
          <span class="material-symbols-outlined text-indigo-500 text-lg">percent</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-slate-900">{data.profitMargin.toFixed(1)}%</p>
        <p class="mt-1 text-xs text-slate-500">Gross margin</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Transaction</p>
          <span class="material-symbols-outlined text-amber-500 text-lg">analytics</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(data.avgOrderValue)}</p>
        <p class="mt-1 text-xs text-slate-500">Per customer receipt</p>
      </article>

      <article class="flex min-w-0 flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-primary/5">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Items</p>
          <span class="material-symbols-outlined text-indigo-500 text-lg">inventory_2</span>
        </div>
        <p class="mt-3 text-2xl font-bold text-slate-900">{data.totalProducts}</p>
        <p class="mt-1 text-xs text-slate-500">Unique SKUs tracked</p>
      </article>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Top Selling Items -->
      <section class="rounded-2xl bg-white p-6 shadow-sm border border-primary/5">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">Top Performers</h3>
          <span class="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary italic">BEST SELLERS</span>
        </div>
        {#if data.topItems.length === 0}
          <div class="py-10 text-center">
            <span class="material-symbols-outlined text-slate-200 text-5xl">bar_chart</span>
            <p class="mt-2 text-sm text-slate-400">No sales data yet.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each data.topItems as item}
              <div class="group flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary text-xs font-bold transition-colors group-hover:bg-primary group-hover:text-white">
                    {item.totalQty}
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-slate-700">{item.name}</p>
                    <p class="text-[10px] text-slate-400 tracking-wide uppercase">Total Volume</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-slate-900">{formatCurrency(item.totalRevenue)}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Recent Orders Table -->
      <section class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-primary/5">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">Operational Log</h3>
          <button class="text-xs font-bold text-primary hover:underline">View All Records</button>
        </div>
        {#if data.recentOrders.length === 0}
          <div class="py-10 text-center text-slate-400">No orders logged.</div>
        {:else}
          <div class="overflow-x-auto rounded-xl border border-primary/5">
            <table class="w-full text-left text-sm">
              <thead class="bg-primary/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th class="px-4 py-3">Order Code</th>
                  <th class="px-4 py-3">Method</th>
                  <th class="px-4 py-3">Amount</th>
                  <th class="px-4 py-3 text-center">Status</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-primary/5">
                {#each data.recentOrders as order}
                  <tr class="group hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3">
                      <p class="font-mono text-xs font-bold text-slate-900">{order.orderNo}</p>
                      <p class="text-[10px] text-slate-400 mt-0.5">{new Date(order.issuedAt).toLocaleDateString()}</p>
                    </td>
                    <td class="px-4 py-3">
                      <span class="flex items-center gap-1.5 text-slate-600">
                        <span class="material-symbols-outlined text-sm">
                          {order.paymentMethod === 'Cash' ? 'payments' : order.paymentMethod === 'Card' ? 'credit_card' : 'qr_code_2'}
                        </span>
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-900">{formatCurrency(order.total)}</td>
                    <td class="px-4 py-3 text-center">
                      <span class={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${order.status === 'returned' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right space-x-1">
                      <button 
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all inline-flex items-center justify-center"
                        onclick={() => printInvoice(order.id)}
                        disabled={busy}
                        title="Print"
                      >
                        {#if busy}
                          <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        {:else}
                          <span class="material-symbols-outlined text-lg">print</span>
                        {/if}
                      </button>
                      {#if order.status !== 'returned'}
                        <button 
                          class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          onclick={() => openReturnConfirm(order.id)}
                          disabled={busy}
                          title="Returns"
                        >
                          <span class="material-symbols-outlined text-lg">undo</span>
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    </div>
  </section>
</main>

{#if showReceipt}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)]" in:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="bg-slate-50 border-b border-primary/5 p-5 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Receipt Preview</h3>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Copy</p>
        </div>
        <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" onclick={() => (showReceipt = false)}>
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      
      <div class="p-6 flex justify-center bg-slate-100/50">
        <div class="rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition-transform hover:scale-[1.02]">
            <iframe 
                id="receiptFrame" 
                srcdoc={receiptHtml} 
                title="Receipt Preview"
                class="bg-white"
                style="width: 280px; height: 380px;"
            ></iframe>
        </div>
      </div>

      <div class="p-5 bg-white border-t border-slate-100 flex gap-3">
        <button class="flex-1 rounded-xl border-2 border-primary bg-white px-4 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/5 active:scale-95 flex items-center justify-center gap-2" onclick={triggerPrint} disabled={busy}>
          {#if busy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            Preparing...
          {:else}
            <span class="material-symbols-outlined text-sm font-bold">print</span>
            Print Receipt
          {/if}
        </button>
        <button class="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-95" onclick={() => (showReceipt = false)}>
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showReturnModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" in:fly={{ y: 20, duration: 400 }}>
      <div class="p-8 text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <span class="material-symbols-outlined text-4xl">history_edu</span>
        </div>
        <h3 class="text-xl font-bold text-slate-900">Return Order?</h3>
        <p class="mt-3 text-sm text-slate-500 leading-relaxed italic">Are you sure you want to return this order? All items will be restocked automatically.</p>
      </div>
      <div class="bg-slate-50 p-6 flex gap-3">
        <button class="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick={() => (showReturnModal = false)}>Cancel</button>
        <button class="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all inline-flex items-center justify-center gap-2" onclick={performReturnOrder} disabled={busy}>
          {#if busy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Processing...
          {:else}
            Confirm Return
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}


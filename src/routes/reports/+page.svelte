<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';

  export let data: PageData;
  const storeName = data.storeName ?? 'OvenFresh POS';

  let searchQuery = $page.url.searchParams.get('search') || '';
  let period = (data.period || 'daily') as 'daily' | 'weekly' | 'monthly' | 'custom';
  let baseDate = data.baseDate || '';
  let dateFrom = data.dateFrom || '';
  let dateTo = data.dateTo || '';
  let busy = false;
  let infoMessage = '';

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

  async function returnOrder(orderId: number) {
    if (!confirm('Are you sure you want to return this order? Items will be restocked.')) return;
    busy = true;
    try {
      const res = await fetch('/api/reports/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const body = await res.json();
      if (!res.ok) {
        infoMessage = body.message ?? 'Return failed.';
        return;
      }
      infoMessage = 'Order returned successfully.';
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
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 280px; color: #000; }
        h2 { margin: 0 0 10px; font-size: 16px; text-align: center; }
        p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { padding: 4px 0; text-align: left; }
        td.right, th.right { text-align: right; }
        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
      </style>
    </head>
    <body>
      <h2>${storeName} Invoice</h2>
      <p>Receipt: ${receipt.receiptNo}</p>
      <p>Order: ${receipt.orderNo}</p>
      <p>Payment: ${receipt.paymentMethod}</p>
      <p>Date: ${new Date(receipt.issuedAt).toLocaleString()}</p>
      <hr />
      <table>${lineRows.replace(/style="[^"]*"/g, '').replace(/<td(?=>)/g, '<td>').replace(/<td(>)/g, '<td>').replace(/<td style="text-align:right;">/g, '<td class="right">')}</table>
      <hr />
      <p style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>${formatCurrency(receipt.subtotal)}</span></p>
      <p style="display: flex; justify-content: space-between;"><span>Tax:</span> <span>${formatCurrency(receipt.tax)}</span></p>
      <hr />
      <p style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;"><span>TOTAL:</span> <span>${formatCurrency(receipt.total)}</span></p>
    </body>
  </html>`;

      receiptHtml = html;
      showReceipt = true;
    } finally {
      busy = false;
    }
  }

  let showReceipt = false;
  let receiptHtml = '';

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
        <span class={`rounded-full px-3 py-1 text-xs font-semibold ${data.dbOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          {data.dbOffline ? 'Offline Mode' : 'Live Mode'}
        </span>
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
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button class="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary-dark" on:click={handleSearch}>
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
        <p class="mt-1 text-xs text-slate-500">Revenue - Cost</p>
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
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all"
                        on:click={() => printInvoice(order.id)}
                        disabled={busy}
                        title="Print"
                      >
                        <span class="material-symbols-outlined text-lg">print</span>
                      </button>
                      {#if order.status !== 'returned'}
                        <button 
                          class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          on:click={() => returnOrder(order.id)}
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="bg-slate-50 border-b border-primary/10 p-4 flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-900">Print Receipt</h3>
        <button class="text-slate-400 hover:text-red-500 transition-colors" on:click={() => (showReceipt = false)}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="p-4 flex justify-center bg-slate-100">
        <iframe 
          id="receiptFrame" 
          srcdoc={receiptHtml} 
          title="Receipt Preview"
          class="bg-white border shadow-sm"
          style="width: 300px; height: 400px;"
        ></iframe>
      </div>

      <div class="p-4 bg-white grid grid-cols-2 gap-3">
        <button class="rounded-xl border border-primary px-3 py-3 font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2" on:click={triggerPrint}>
          <span class="material-symbols-outlined text-sm">print</span>
          Print
        </button>
        <button class="rounded-xl bg-primary px-3 py-3 font-bold text-white hover:bg-primary-dark transition-colors" on:click={() => (showReceipt = false)}>
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

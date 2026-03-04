<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  export let data: PageData;

  let searchQuery = $page.url.searchParams.get('search') || '';
  let busy = false;
  let infoMessage = '';

  function handleSearch() {
    const url = new URL($page.url);
    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    } else {
      url.searchParams.delete('search');
    }
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
      location.reload(); // Quick refresh to update data
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
            `<tr><td style="padding:6px 0;">${item.name} x${item.quantity}</td><td style="text-align:right;">${formatCurrency(item.lineTotal)}</td></tr>`
        )
        .join('');

      const html = `<!doctype html>
  <html>
    <head><title>${receipt.receiptNo}</title></head>
    <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin:0 0 12px;">OvenFresh Invoice</h2>
      <p style="margin:4px 0;">Receipt: ${receipt.receiptNo}</p>
      <p style="margin:4px 0;">Order: ${receipt.orderNo}</p>
      <p style="margin:4px 0;">Payment: ${receipt.paymentMethod}</p>
      <p style="margin:4px 0;">Date: ${new Date(receipt.issuedAt).toLocaleString()}</p>
      <hr style="margin:12px 0;" />
      <table style="width:100%; border-collapse: collapse;">${lineRows}</table>
      <hr style="margin:12px 0;" />
      <p style="margin:4px 0;">Subtotal: ${formatCurrency(receipt.subtotal)}</p>
      <p style="margin:4px 0;">Tax (8%): ${formatCurrency(receipt.tax)}</p>
      <p style="margin:4px 0; font-weight:700;">Total: ${formatCurrency(receipt.total)}</p>
    </body>
  </html>`;

      const popup = window.open('', '_blank', 'width=420,height=720');
      if (!popup) return;
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
    } finally {
      busy = false;
    }
  }
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
          {data.dbOffline ? 'Offline Mode' : 'Live Mode'}
        </span>
      </div>
      {#if data.dbOffline}
        <div class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{data.dbMessage}</div>
      {/if}
      {#if infoMessage}
        <div class="mt-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">{infoMessage}</div>
      {/if}
      
      <div class="mt-6 flex gap-3">
        <input
          class="w-full max-w-md rounded-lg border border-primary/20 px-4 py-2"
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
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Active Products</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{data.totalProducts}</p>
      </article>
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Total Orders</p>
        <p class="mt-2 text-3xl font-bold text-primary">{data.totalOrders}</p>
      </article>
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Total Revenue</p>
        <p class="mt-2 text-3xl font-bold text-emerald-600">{formatCurrency(data.totalRevenue)}</p>
      </article>
      <article class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold text-slate-600">Avg Order Value</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(data.avgOrderValue)}</p>
      </article>
    </div>

    <!-- Top Selling Items -->
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <h3 class="mb-4 text-lg font-bold text-slate-900">Top Selling Items (All Time)</h3>
      {#if data.topItems.length === 0}
        <p class="text-sm text-slate-500">No sales recorded yet.</p>
      {:else}
        <div class="space-y-3">
          {#each data.topItems as item}
            <article class="flex items-center justify-between rounded-lg border border-primary/10 p-3">
              <div>
                <p class="font-semibold text-slate-900">{item.name}</p>
                <p class="text-xs text-slate-500">Qty sold: {item.totalQty}</p>
              </div>
              <p class="font-bold text-primary">{formatCurrency(item.totalRevenue)}</p>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Recent Orders -->
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <h3 class="mb-4 text-lg font-bold text-slate-900">Recent Orders</h3>
      {#if data.recentOrders.length === 0}
        <p class="text-sm text-slate-500">No orders yet.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                <th class="pb-2 pr-4">Order No</th>
                <th class="pb-2 pr-4">Payment</th>
                <th class="pb-2 pr-4">Total</th>
                <th class="pb-2 pr-4">Status</th>
                <th class="pb-2 pr-4">Date</th>
                <th class="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each data.recentOrders as order}
                <tr class="py-2 text-slate-700">
                  <td class="py-2 pr-4 font-mono font-medium">{order.orderNo}</td>
                  <td class="py-2 pr-4">{order.paymentMethod}</td>
                  <td class="py-2 pr-4 font-bold text-primary">{formatCurrency(order.total)}</td>
                  <td class="py-2 pr-4">
                    <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${order.status === 'returned' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td class="py-2 pr-4 text-xs text-slate-400">{new Date(order.issuedAt).toLocaleString()}</td>
                  <td class="flex items-center gap-2 py-2">
                    <button 
                      class="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      on:click={() => printInvoice(order.id)}
                      disabled={busy}
                    >
                      <span class="material-symbols-outlined text-sm">print</span>
                      Print
                    </button>
                    {#if order.status !== 'returned'}
                      <button 
                        class="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        on:click={() => returnOrder(order.id)}
                        disabled={busy}
                      >
                        <span class="material-symbols-outlined text-sm">undo</span>
                        Return
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
  </section>
</main>

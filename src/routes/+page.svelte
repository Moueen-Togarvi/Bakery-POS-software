<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';

  type PaymentMethod = 'Cash' | 'Card' | 'QR';
  type SaleReceipt = {
    receiptNo: string;
    orderNo: string;
    customerName: string;
    paymentMethod: PaymentMethod;
    issuedAt: string;
    items: Array<{
      productId: number;
      name: string;
      imageUrl: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      unitType: string;
    }>;
    subtotal: number;
    tax: number;
    total: number;
  };

  export let data: PageData;

  let categories = data.categories;
  let products = data.products;
  let cart = data.cart;
  let recentOrders = [...(data.recentOrders ?? [])];
  let dbOffline = data.dbOffline;
  let dbMessage = data.dbMessage;
  let selectedCategoryId = 0;
  let selectedFlavor = '';
  let cartLoading = false;
  let uiMessage = '';
  let receipt: SaleReceipt | null = null;
  let showReceipt = false;
  let barcodeBuffer = '';
  let lastBarcodeTime = 0;
  let searchQuery = '';
  let discountValue = 0;
  const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];
  const fractionalUnits = new Set(['kg', 'lb']);
  const storeName = data.storeName ?? 'OvenFresh POS';

  $: cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  $: maxDiscount = cart.subtotal > 0 ? cart.subtotal : 0;
  $: rawDiscount = Number(discountValue) || 0;
  $: discountAmount = Math.min(maxDiscount, Math.max(0, rawDiscount));
  $: payableTotal = Math.max(0, Number((cart.total - discountAmount).toFixed(2)));
  $: categoryFlavors = Array.from(
    new Set(
      products
        .filter((p) => selectedCategoryId !== 0 && Number(p.categoryId) === Number(selectedCategoryId))
        .map((p) => p.flavor)
        .filter((f): f is string => Boolean(f))
    )
  );
  $: if (selectedFlavor && !categoryFlavors.includes(selectedFlavor)) selectedFlavor = '';
  $: filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategoryId === 0 || Number(p.categoryId) === Number(selectedCategoryId);
    const matchesSubcategory = !selectedFlavor || p.flavor === selectedFlavor;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const now = Date.now();
    
    // Most barcode scanners type characters very quickly.
    // If more than 50ms implies a pause, wait a bit longer to prevent early cut-offs on slow connections.
    if (now - lastBarcodeTime > 500) {
      barcodeBuffer = '';
    }
    lastBarcodeTime = now;

    if (event.key === 'Enter') {
      const code = barcodeBuffer.trim();
      if (code.length > 2) {
        const product = products.find(p => p.sku === code || p.sku === barcodeBuffer);
        if (product) {
          updateCart(product.id, 1);
        }
      }
      barcodeBuffer = '';
    } else if (event.key.length === 1) {
      barcodeBuffer += event.key;
    }
  }

  async function handleSearchEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    const code = searchQuery.trim();
    if (!code) return;

    const product = products.find((p) => (p.sku || '').toLowerCase() === code.toLowerCase());
    if (product) {
      event.preventDefault();
      await updateCart(product.id, 1);
      searchQuery = '';
    }
  }

  function getStepByUnit(unitType: string) {
    const unit = (unitType || '').toLowerCase();
    return fractionalUnits.has(unit) ? 0.1 : 1;
  }

  import { onMount } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  async function updateCart(productId: number, delta: number) {
    cartLoading = true;
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, delta })
      });
      if (!res.ok) {
        const body = await res.json();
        uiMessage = body.message ?? 'Cart update failed.';
        return;
      }
      cart = await res.json();
      uiMessage = '';
    } finally {
      cartLoading = false;
    }
  }

  async function clearOrder() {
    cartLoading = true;
    try {
      const res = await fetch('/api/cart', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        uiMessage = body.message ?? 'Clear cart failed.';
        return;
      }
      cart = await res.json();
      uiMessage = '';
    } finally {
      cartLoading = false;
    }
  }

  async function setPaymentMethod(paymentMethod: PaymentMethod) {
    cartLoading = true;
    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      });
      if (!res.ok) {
        const body = await res.json();
        uiMessage = body.message ?? 'Payment method update failed.';
        return;
      }
      cart = await res.json();
      uiMessage = '';
    } finally {
      cartLoading = false;
    }
  }

  async function completeSale() {
    cartLoading = true;
    try {
      const res = await fetch('/api/cart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: cart.paymentMethod,
          discountAmount
        })
      });
      const body = await res.json();
      if (!res.ok) {
        uiMessage = body.message ?? 'Sale completion failed.';
        return;
      }
      receipt = body.receipt;
      cart = body.cart;
      doPrint(body.receipt);
      uiMessage = '';
    } finally {
      cartLoading = false;
    }
  }

  function printReceipt() {
    if (!receipt) return;
    doPrint(receipt);
  }

  async function returnOrder(orderId: number) {
    if (!confirm('Are you sure you want to return this order? Items will be restocked.')) return;
    cartLoading = true;
    try {
      const res = await fetch('/api/reports/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (!res.ok) {
        const body = await res.json();
        uiMessage = body.message ?? 'Return failed.';
        return;
      }
      uiMessage = 'Order returned successfully.';
      recentOrders = recentOrders.map((order) =>
        order.id === orderId ? { ...order, status: 'returned' } : order
      );
    } finally {
      cartLoading = false;
    }
  }

  async function printInvoice(orderId: number) {
    cartLoading = true;
    try {
      const res = await fetch(`/api/reports/receipt?orderId=${orderId}`);
      if (!res.ok) {
        const body = await res.json();
        uiMessage = body.message ?? 'Failed to fetch invoice.';
        return;
      }
      const body = await res.json();
      doPrint(body.receipt);
    } finally {
      cartLoading = false;
    }
  }

  function doPrint(rcpt: any) {
    const lineRows = rcpt.items
      .map(
        (item: any) =>
          `<tr><td style="padding:6px 0;">${item.name}${item.flavor ? ` (${item.flavor})` : ''} (${item.quantity} ${item.unitType})</td><td style="text-align:right;">${formatCurrency(item.lineTotal)}</td></tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <title>${rcpt.receiptNo}</title>
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
    <h2>${storeName}</h2>
    <p>Receipt: ${rcpt.receiptNo}</p>
    <p>Order: ${rcpt.orderNo}</p>
    <p>Payment: ${rcpt.paymentMethod}</p>
    <hr />
    <table>${lineRows.replace(/style="[^"]*"/g, '').replace(/<td(?=>)/g, '<td>').replace(/<td(>)/g, '<td>').replace(/<td style="text-align:right;">/g, '<td class="right">')}</table>
    <hr />
    <p style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>${formatCurrency(rcpt.subtotal)}</span></p>
    <p style="display: flex; justify-content: space-between;"><span>Tax:</span> <span>${formatCurrency(rcpt.tax)}</span></p>
    <hr />
    <p style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;"><span>TOTAL:</span> <span>${formatCurrency(rcpt.total)}</span></p>
    <p style="text-align: center; margin-top: 20px;">Thank you for your visit!</p>
  </body>
</html>`;

    receiptHtml = html;
    showReceipt = true;
  }

  let receiptHtml = '';

  function triggerPrint() {
    const iframe = document.getElementById('receiptFrame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  }
</script>

<svelte:head>
  <title>Sales Dashboard | {storeName}</title>
</svelte:head>

<main class="flex min-h-[calc(100vh-69px)] overflow-hidden text-sm">
  <section class="flex flex-1 flex-col bg-white">
    <div class="grid grid-cols-2 gap-2 border-b border-primary/10 p-3 lg:grid-cols-4">
      <article class="rounded-xl bg-primary/10 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Today's Sales</p>
        <p class="mt-0.5 text-lg font-bold text-primary">{formatCurrency(data.todaySales || 0)}</p>
      </article>
      <article class="rounded-xl bg-emerald-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Today's Orders</p>
        <p class="mt-0.5 text-lg font-bold text-emerald-700">{data.todayOrders || 0}</p>
      </article>
      <article class="rounded-xl bg-amber-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Active Items</p>
        <p class="mt-0.5 text-lg font-bold text-amber-700">{products.length}</p>
      </article>
      <article class="rounded-xl bg-sky-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Today's Profit</p>
        <p class="mt-0.5 text-lg font-bold {Number(data.todayProfit || 0) < 0 ? 'text-red-600' : 'text-sky-700'}">
          {formatCurrency(data.todayProfit || 0)}
        </p>
        <p class="mt-1 text-[9px] text-slate-500">
          Revenue - Cost = Profit
        </p>
      </article>
    </div>

    {#if dbOffline || uiMessage}
      <div class="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {dbOffline ? dbMessage : uiMessage}
      </div>
    {/if}

    <div class="flex items-center gap-3 border-b border-primary/10 p-3">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input 
          id="product-search-input"
          class="w-full rounded-full border border-primary/20 bg-slate-50 py-1.5 pl-9 pr-4 text-sm focus:border-primary focus:bg-white focus:outline-none"
          placeholder="Scan barcode or search..."
          bind:value={searchQuery}
          on:keydown={handleSearchEnter}
        />
      </div>
    </div>

    <div class="no-scrollbar flex gap-2 overflow-x-auto border-b border-primary/5 p-3">
      {#each categories as category}
        <button
          class={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            (selectedCategoryId === 0 && category.name === 'All Items') || selectedCategoryId === category.id
              ? 'bg-primary text-white'
              : 'bg-primary/10 text-slate-700 hover:bg-primary/20'
          }`}
          on:click={() => { selectedCategoryId = category.name === 'All Items' ? 0 : category.id; selectedFlavor = ''; }}
        >
          {category.name}
        </button>
      {/each}
    </div>

    {#if selectedCategoryId !== 0 && categoryFlavors.length > 0}
      <div class="no-scrollbar flex gap-2 overflow-x-auto border-b border-primary/5 px-3 pb-3">
        <button
          class={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
            !selectedFlavor ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
          }`}
          on:click={() => (selectedFlavor = '')}
        >
          All Subcategories
        </button>
        {#each categoryFlavors as flavor}
          <button
            class={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
              selectedFlavor === flavor ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
            }`}
            on:click={() => (selectedFlavor = flavor)}
          >
            {flavor}
          </button>
        {/each}
      </div>
    {/if}

    <div class="no-scrollbar grid grid-cols-2 gap-2 overflow-y-auto p-3 md:grid-cols-4 xl:grid-cols-6">
      {#if filteredProducts.length === 0}
        <p class="col-span-full text-sm font-medium text-slate-500">No products found in this category.</p>
      {:else}
        {#each filteredProducts as product}
          <button
            class="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-primary/10 bg-white text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            on:click={() => updateCart(product.id, 1)}
            disabled={cartLoading}
          >
            <div class="relative aspect-[4/3] overflow-hidden bg-slate-50">
              <img
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={product.imageUrl ?? '/assets/checkout-screen.png'}
                alt={product.name}
              />
            </div>
            <div class="p-1.5">
              <h3 class="text-xs font-semibold text-slate-800 leading-tight">
                {product.name}
                {#if product.flavor}
                  <span class="text-[10px] font-normal text-slate-500 block">({product.flavor})</span>
                {/if}
              </h3>
              <p class="mt-0.5 text-xs font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Recent Sales Section -->
    <div class="mt-auto border-t border-primary/10 bg-slate-50 p-3 max-h-[300px] flex flex-col">
      <h3 class="mb-2 text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Sales</h3>
      <div class="no-scrollbar flex-1 overflow-y-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-primary/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <tr>
              <th class="px-2 py-2">Order No</th>
              <th class="px-2 py-2">Customer</th>
              <th class="px-2 py-2">Method</th>
              <th class="px-2 py-2">Items</th>
              <th class="px-2 py-2">Status</th>
              <th class="px-2 py-2">Date</th>
              <th class="px-2 py-2">Total</th>
              <th class="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-primary/5">
            {#each recentOrders.slice(0, 5) as order}
              <tr class="group hover:bg-slate-50 transition-colors">
                <td class="px-2 py-2 font-bold text-slate-900">{order.orderNo}</td>
                <td class="px-2 py-2 text-slate-600">{order.customerName || 'Walk-in Customer'}</td>
                <td class="px-2 py-2 text-slate-700">{order.paymentMethod}</td>
                <td class="px-2 py-2 text-amber-700">{order.itemCount}</td>
                <td class="px-2 py-2">
                  <span class={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${order.status === 'returned' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{order.status}</span>
                </td>
                <td class="px-2 py-2 text-slate-400">{new Date(order.issuedAt).toLocaleString()}</td>
                <td class="px-2 py-2 font-bold text-slate-900">{formatCurrency(order.total)}</td>
                <td class="px-2 py-2">
                  <button
                    class="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                    on:click={() => printInvoice(order.id)}
                    disabled={cartLoading}
                  >
                    <span class="material-symbols-outlined text-[14px]">print</span>
                    Print
                  </button>
                  {#if order.status !== 'returned'}
                    <button
                      class="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100"
                      on:click={() => returnOrder(order.id)}
                      disabled={cartLoading}
                    >
                      <span class="material-symbols-outlined text-[14px]">undo</span>
                      Return
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
            {#if recentOrders.length === 0}
              <tr>
                <td colspan="8" class="py-4 text-center text-xs italic text-slate-400">No recent sales found.</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <aside class="hidden w-full max-w-[400px] flex-col border-l border-primary/10 bg-white shadow-xl lg:flex h-[calc(100vh-69px)]">
    <div class="border-b border-primary/5 p-4 shrink-0">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-xl font-bold text-slate-900">Current Order</h2>
        <button class="text-primary" on:click={clearOrder} disabled={cartLoading}>
          <span class="material-symbols-outlined">delete_sweep</span>
        </button>
      </div>
      <p class="text-sm text-slate-500 font-mono">{cart.orderNo} • {cart.customerName}</p>
    </div>

    <div class="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
      {#if !cart.items.length}
        <div class="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-slate-600">
          Cart is empty. Tap a product card to add items.
        </div>
      {/if}

      {#each cart.items as item}
        <div class="group flex items-center gap-4">
          <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            <img class="h-full w-full object-cover" src={item.imageUrl ?? '/assets/checkout-screen.png'} alt={item.name} />
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-slate-800">
              {item.name}
              {#if (item as any).flavor}
                <span class="text-[10px] font-normal text-slate-400">({(item as any).flavor})</span>
              {/if}
            </h4>
            <p class="text-xs text-slate-500">{formatCurrency(item.unitPrice)} each</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
              on:click={() => updateCart(item.productId, -getStepByUnit(item.unitType))}
              disabled={cartLoading}
            >
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="w-12 text-center text-sm font-bold">{item.quantity} {item.unitType}</span>
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
              on:click={() => updateCart(item.productId, getStepByUnit(item.unitType))}
              disabled={cartLoading}
            >
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <div class="min-w-[70px] text-right">
            <p class="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="space-y-2 bg-primary/5 p-4">
      <div>
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment Method</p>
        <div class="grid grid-cols-3 gap-2">
          {#each paymentMethods as method}
            <button
              class={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                cart.paymentMethod === method
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary/30 bg-white text-slate-700'
              }`}
              on:click={() => setPaymentMethod(method)}
              disabled={cartLoading}
            >
              {method}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex justify-between text-sm">
        <span class="text-slate-500">Subtotal</span>
        <span class="font-medium text-slate-800">{formatCurrency(cart.subtotal)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-500">Tax (8%)</span>
        <span class="font-medium text-slate-800">{formatCurrency(cart.tax)}</span>
      </div>
      <div class="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
        <span class="text-slate-500">Discount</span>
        <input
          class="w-24 rounded-md border border-primary/20 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 outline-none focus:border-primary"
          type="number"
          min="0"
          step="0.01"
          bind:value={discountValue}
          disabled={cartLoading}
          placeholder="Amount"
        />
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-500">Discount Amount</span>
        <span class="font-medium text-rose-700">- {formatCurrency(discountAmount)}</span>
      </div>
      <div class="flex items-end justify-between border-t border-primary/10 pt-2">
        <span class="text-sm font-bold text-slate-900">Total</span>
        <span class="text-lg font-black text-primary">{formatCurrency(payableTotal)}</span>
      </div>

      <button
        class="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-lg shadow-primary/30"
        on:click={completeSale}
        disabled={cartLoading}
      >
        Complete Sale
      </button>
    </div>
  </aside>
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

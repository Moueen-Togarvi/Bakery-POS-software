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
  let dbOffline = data.dbOffline;
  let dbMessage = data.dbMessage;
  let selectedCategoryId = 0;
  let productsLoading = false;
  let cartLoading = false;
  let uiMessage = '';
  let receipt: SaleReceipt | null = null;
  let showReceipt = false;
  let barcodeBuffer = '';
  let lastBarcodeTime = 0;
  let searchQuery = '';
  const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];

  $: cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  $: filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    const now = Date.now();
    if (now - lastBarcodeTime > 100) {
      barcodeBuffer = '';
    }
    lastBarcodeTime = now;

    if (event.key === 'Enter') {
      if (barcodeBuffer.length > 3) {
        const product = products.find(p => p.sku === barcodeBuffer);
        if (product) {
          updateCart(product.id, 1);
          barcodeBuffer = '';
        }
      }
      barcodeBuffer = '';
    } else if (event.key.length === 1) {
      barcodeBuffer += event.key;
    }
  }

  import { onMount } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  async function loadProducts(categoryId: number) {
    selectedCategoryId = categoryId;
    productsLoading = true;
    try {
      const query = categoryId ? `?categoryId=${categoryId}` : '';
      const res = await fetch(`/api/products${query}`);
      products = await res.json();
    } finally {
      productsLoading = false;
    }
  }

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
      const res = await fetch('/api/cart/complete', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        uiMessage = body.message ?? 'Sale completion failed.';
        return;
      }
      receipt = body.receipt;
      cart = body.cart;
      showReceipt = true;
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
      location.reload();
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
    <h2>OvenFresh POS</h2>
    <p>Receipt: ${rcpt.receiptNo}</p>
    <p>Order: ${rcpt.orderNo}</p>
    <p>Payment: ${rcpt.paymentMethod}</p>
    <hr />
    <table>${lineRows.replace(/style="[^"]*"/g, '').replace(/<td(?=>)/g, '<td>').replace(/<td(>)/g, '<td>').replace(/<td style="text-align:right;">/g, '<td class="right">')}</table>
    <hr />
    <p style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>${formatCurrency(rcpt.subtotal)}</span></p>
    <p style="display: flex; justify-content: space-between;"><span>Tax (8%):</span> <span>${formatCurrency(rcpt.tax)}</span></p>
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
  <title>Sales Dashboard | OvenFresh POS</title>
</svelte:head>

<main class="flex min-h-[calc(100vh-69px)] overflow-hidden text-sm">
  <section class="flex flex-1 flex-col bg-white">
    <div class="grid grid-cols-2 gap-2 border-b border-primary/10 p-3 lg:grid-cols-4">
      <article class="rounded-xl bg-primary/10 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Order Value</p>
        <p class="mt-0.5 text-lg font-bold text-primary">{formatCurrency(cart.total)}</p>
      </article>
      <article class="rounded-xl bg-emerald-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Cart Items</p>
        <p class="mt-0.5 text-lg font-bold text-emerald-700">{cartItemCount}</p>
      </article>
      <article class="rounded-xl bg-amber-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Active Items</p>
        <p class="mt-0.5 text-lg font-bold text-amber-700">{products.length}</p>
      </article>
      <article class="rounded-xl bg-sky-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Server Mode</p>
        <p class="mt-0.5 text-lg font-bold text-sky-700">{dbOffline ? 'Sample' : 'Live'}</p>
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
          class="w-full rounded-full border border-primary/20 bg-slate-50 py-1.5 pl-9 pr-4 text-sm focus:border-primary focus:bg-white focus:outline-none"
          placeholder="Scan barcode or search..."
          bind:value={searchQuery}
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
          on:click={() => loadProducts(category.name === 'All Items' ? 0 : category.id)}
        >
          {category.name}
        </button>
      {/each}
    </div>

    <div class="no-scrollbar grid grid-cols-2 gap-3 overflow-y-auto p-4 md:grid-cols-3 xl:grid-cols-5">
      {#if productsLoading}
        <p class="col-span-full text-sm font-medium text-slate-500">Loading products...</p>
      {:else}
        {#each filteredProducts as product}
          <button
            class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-primary/10 bg-white text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            on:click={() => updateCart(product.id, 1)}
            disabled={cartLoading}
          >
            <div class="relative aspect-square overflow-hidden bg-slate-50">
              <img
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={product.imageUrl ?? '/assets/checkout-screen.png'}
                alt={product.name}
              />
            </div>
            <div class="p-2">
              <h3 class="text-sm font-semibold text-slate-800 leading-tight">
                {product.name}
                {#if product.flavor}
                  <span class="text-[10px] font-normal text-slate-500 block">({product.flavor})</span>
                {/if}
              </h3>
              <p class="mt-0.5 text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Recent Sales Section -->
    <div class="mt-auto border-t border-primary/10 bg-slate-50 p-3 max-h-[250px] flex flex-col">
      <h3 class="mb-2 text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Sales</h3>
      <div class="no-scrollbar flex-1 overflow-y-auto space-y-2">
        {#each (data.recentOrders || []).slice(0, 5) as order}
          <div class="rounded-xl border border-primary/10 bg-white p-2.5 shadow-sm flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class={`rounded-full p-1.5 ${order.status === 'returned' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <span class="material-symbols-outlined text-lg">{order.status === 'returned' ? 'undo' : 'check_circle'}</span>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] font-mono text-slate-500">{order.orderNo}</span>
                  <span class="text-[10px] text-slate-400">• {new Date(order.issuedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5">
              <button 
                class="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                on:click={() => printInvoice(order.id)}
                disabled={cartLoading}
              >
                <span class="material-symbols-outlined text-[14px]">print</span>
                Print
              </button>
              {#if order.status !== 'returned'}
                <button 
                  class="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100"
                  on:click={() => returnOrder(order.id)}
                  disabled={cartLoading}
                >
                  <span class="material-symbols-outlined text-[14px]">undo</span>
                  Return
                </button>
              {/if}
            </div>
          </div>
        {/each}
        {#if data.recentOrders.length === 0}
          <p class="text-center py-4 text-xs text-slate-400 italic">No recent sales found.</p>
        {/if}
      </div>
    </div>
  </section>

  <aside class="hidden w-full max-w-[400px] flex-col border-l border-primary/10 bg-white shadow-xl lg:flex">
    <div class="border-b border-primary/5 p-6">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-xl font-bold text-slate-900">Current Order</h2>
        <button class="text-primary" on:click={clearOrder} disabled={cartLoading}>
          <span class="material-symbols-outlined">delete_sweep</span>
        </button>
      </div>
      <p class="text-sm text-slate-500">{cart.orderNo} • {cart.customerName}</p>
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
              on:click={() => updateCart(item.productId, item.unitType === 'pcs' ? -1 : -0.1)}
              disabled={cartLoading}
            >
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="w-12 text-center text-sm font-bold">{item.quantity} {item.unitType}</span>
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"
              on:click={() => updateCart(item.productId, item.unitType === 'pcs' ? 1 : 0.1)}
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

    <div class="space-y-3 bg-primary/5 p-6">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Method</p>
        <div class="grid grid-cols-3 gap-2">
          {#each paymentMethods as method}
            <button
              class={`rounded-lg border px-2 py-2 text-xs font-semibold ${
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
      <div class="flex items-end justify-between border-t border-primary/10 pt-3">
        <span class="text-lg font-bold text-slate-900">Total</span>
        <span class="text-2xl font-black text-primary">{formatCurrency(cart.total)}</span>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-2">
        <button class="flex items-center justify-center gap-2 py-2 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all text-sm">
          <span class="material-symbols-outlined text-sm">pause</span>
          Hold
        </button>
        <button class="flex items-center justify-center gap-2 py-2 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all text-sm">
          <span class="material-symbols-outlined text-sm">confirmation_number</span>
          Coupon
        </button>
      </div>

      <button
        class="mt-4 w-full rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30"
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

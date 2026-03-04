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

    const lineRows = receipt.items
      .map(
        (item) =>
          `<tr><td style="padding:6px 0;">${item.name} (${item.quantity} ${item.unitType})</td><td style="text-align:right;">${formatCurrency(item.lineTotal)}</td></tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <title>${receipt.receiptNo}</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
    <h2 style="margin:0 0 12px;">OvenFresh POS Receipt</h2>
    <p style="margin:4px 0;">Receipt: ${receipt.receiptNo}</p>
    <p style="margin:4px 0;">Order: ${receipt.orderNo}</p>
    <p style="margin:4px 0;">Payment: ${receipt.paymentMethod}</p>
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
  }
</script>

<svelte:head>
  <title>Sales Dashboard | OvenFresh POS</title>
</svelte:head>

<main class="flex min-h-[calc(100vh-69px)] overflow-hidden">
  <section class="flex flex-1 flex-col bg-white">
    <div class="grid grid-cols-2 gap-3 border-b border-primary/10 p-4 lg:grid-cols-4">
      <article class="rounded-xl bg-primary/10 p-3">
        <p class="text-xs font-semibold text-slate-600">Current Order</p>
        <p class="mt-1 text-xl font-bold text-primary">{formatCurrency(cart.total)}</p>
      </article>
      <article class="rounded-xl bg-emerald-50 p-3">
        <p class="text-xs font-semibold text-slate-600">Items In Cart</p>
        <p class="mt-1 text-xl font-bold text-emerald-700">{cartItemCount}</p>
      </article>
      <article class="rounded-xl bg-amber-50 p-3">
        <p class="text-xs font-semibold text-slate-600">Active Products</p>
        <p class="mt-1 text-xl font-bold text-amber-700">{products.length}</p>
      </article>
      <article class="rounded-xl bg-sky-50 p-3">
        <p class="text-xs font-semibold text-slate-600">Mode</p>
        <p class="mt-1 text-xl font-bold text-sky-700">{dbOffline ? 'Sample' : 'Live'}</p>
      </article>
    </div>

    {#if dbOffline || uiMessage}
      <div class="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {dbOffline ? dbMessage : uiMessage}
      </div>
    {/if}

    <div class="flex items-center gap-4 border-b border-primary/10 p-4">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input 
          class="w-full rounded-full border border-primary/20 bg-slate-50 py-2 pl-10 pr-4 focus:border-primary focus:bg-white focus:outline-none"
          placeholder="Search items or scan barcode..."
          bind:value={searchQuery}
        />
      </div>
    </div>

    <div class="no-scrollbar flex gap-4 overflow-x-auto border-b border-primary/5 p-4">
      {#each categories as category}
        <button
          class={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
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

    <div class="no-scrollbar grid grid-cols-2 gap-4 overflow-y-auto p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {#if productsLoading}
        <p class="col-span-full text-sm font-medium text-slate-500">Loading products...</p>
      {:else}
        {#each filteredProducts as product}
          <button
            class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-primary/10 bg-white text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            on:click={() => updateCart(product.id, 1)}
            disabled={cartLoading}
          >
            <div class="relative aspect-square overflow-hidden">
              <img
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={product.imageUrl ?? '/assets/checkout-screen.png'}
                alt={product.name}
              />
            </div>
            <div class="p-3">
              <h3 class="font-semibold text-slate-800">{product.name}</h3>
              <p class="mt-1 font-bold text-primary">{formatCurrency(product.price)}</p>
            </div>
          </button>
        {/each}
      {/if}
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
            <h4 class="text-sm font-semibold text-slate-800">{item.name}</h4>
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

{#if showReceipt && receipt}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <h3 class="text-xl font-bold text-slate-900">Sale Receipt</h3>
      <p class="mt-1 text-xs text-slate-500">{receipt.receiptNo} • {receipt.orderNo}</p>
      <div class="mt-4 space-y-2 rounded-lg border border-primary/20 p-3 text-sm">
        {#each receipt.items as item}
          <div class="flex items-center justify-between">
            <span>{item.name} ({item.quantity} {item.unitType})</span>
            <span class="font-semibold">{formatCurrency(item.lineTotal)}</span>
          </div>
        {/each}
        <div class="mt-2 border-t border-primary/10 pt-2">
          <div class="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
          <div class="flex justify-between text-slate-600"><span>Tax</span><span>{formatCurrency(receipt.tax)}</span></div>
          <div class="flex justify-between font-bold text-slate-900"><span>Total</span><span>{formatCurrency(receipt.total)}</span></div>
        </div>
      </div>
      <div class="mt-5 grid grid-cols-2 gap-3">
        <button class="rounded-xl border border-primary px-3 py-2 font-semibold text-primary" on:click={printReceipt}>
          Print Receipt
        </button>
        <button class="rounded-xl bg-primary px-3 py-2 font-semibold text-white" on:click={() => (showReceipt = false)}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

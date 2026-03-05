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

  let { data } = $props();

  let categories = $state(data.categories);
  let products = $state(data.products);
  let cart = $state(data.cart);
  let dbOffline = $state(data.dbOffline);
  let dbMessage = $state(data.dbMessage);
  let selectedCategoryId = $state(0);
  let selectedFlavor = $state('');
  let cartLoading = $state(false);
  let uiMessage = $state('');
  let receipt = $state<SaleReceipt | null>(null);
  let showReceipt = $state(false);
  let barcodeBuffer = $state('');
  let lastBarcodeTime = $state(0);
  let searchQuery = $state('');
  let discountValue = $state(0);
  const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];
  const fractionalUnits = new Set(['kg', 'lb']);
  const storeName = $derived(data.storeName ?? 'OvenFresh POS');

  let cartItemCount = $derived(cart.items.reduce((sum, item) => sum + item.quantity, 0));
  let maxDiscount = $derived(cart.subtotal > 0 ? cart.subtotal : 0);
  let rawDiscount = $derived(Number(discountValue) || 0);
  let discountAmount = $derived(Math.min(maxDiscount, Math.max(0, rawDiscount)));
  let payableTotal = $derived(Math.max(0, Number((cart.total - discountAmount).toFixed(2))));
  let categoryFlavors = $derived(
    Array.from(
      new Set(
        products
          .filter((p) => selectedCategoryId !== 0 && Number(p.categoryId) === Number(selectedCategoryId))
          .map((p) => p.flavor)
          .filter((f): f is string => Boolean(f))
      )
    )
  );
  
  // Effect to clear selected flavor if it's no longer in the list
  $effect(() => {
    if (selectedFlavor && !categoryFlavors.includes(selectedFlavor)) {
      selectedFlavor = '';
    }
  });

  let filteredProducts = $derived(products.filter(p => {
    const matchesCategory = selectedCategoryId === 0 || Number(p.categoryId) === Number(selectedCategoryId);
    const matchesSubcategory = !selectedFlavor || p.flavor === selectedFlavor;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSubcategory && matchesSearch;
  }));

  let barcodeTimeout: ReturnType<typeof setTimeout>;

  function triggerBarcode() {
    const code = barcodeBuffer.trim();
    barcodeBuffer = '';
    if (code.length > 2) {
      const product = products.find(p => p.sku === code);
      if (product) {
        updateCart(product.id, 1);
        toastStore.success(`${product.name} added!`);
        // Clear search if it's currently focused or filled
        searchQuery = '';
      } else {
        console.warn('Scanned code not found:', code);
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const now = Date.now();
    const diff = now - lastBarcodeTime;
    lastBarcodeTime = now;

    const isFast = diff < 50;
    const isInputFocused = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    
    // Scanners usually send 'Enter' at the end. We handle it instantly.
    if (event.key === 'Enter') {
       if (barcodeBuffer.length > 0) {
           event.preventDefault(); 
           clearTimeout(barcodeTimeout);
           triggerBarcode();
       }
       return;
    }
    
    if (event.key.length === 1) {
      if (isInputFocused) {
        // If we detect fast scanning or we are already in a scan sequence, 
        // prevent the character from appearing in the input field.
        if (isFast || barcodeBuffer.length > 0) {
          event.preventDefault();
          barcodeBuffer += event.key;
          clearTimeout(barcodeTimeout);
          barcodeTimeout = setTimeout(triggerBarcode, 100);
          return;
        }
      } else {
        // Global collection
        barcodeBuffer += event.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(triggerBarcode, 100);
      }
    }
  }

  async function handleSearchEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    // Manual search enter logic
    if (barcodeBuffer.length > 0) return; // Let handleKeydown handle it
    
    const code = searchQuery.trim();
    if (!code) return;

    const product = products.find((p) => (p.sku || '').toLowerCase() === code.toLowerCase());
    if (product) {
      event.preventDefault();
      await updateCart(product.id, 1);
      toastStore.success(`${product.name} added!`);
      searchQuery = '';
    }
  }

  function getStepByUnit(unitType: string) {
    const unit = (unitType || '').toLowerCase();
    return fractionalUnits.has(unit) ? 0.1 : 1;
  }

  import { page } from '$app/stores';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { onMount } from 'svelte';
  onMount(() => {
    toastStore.info('Scanner Active: Ready for sales barcode', 2000);
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
    if (cartLoading || cart.items.length === 0) return;
    
    cartLoading = true;
    uiMessage = '';
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
        toastStore.error(uiMessage);
        return;
      }
      
      receipt = body.receipt;
      cart = body.cart;
      doPrint(receipt);
      toastStore.success('Order Completed!', 'Your fresh treats are baking 🍩');
      
      // Force refresh of page data (sales stats)
      await invalidateAll();
    } catch (err) {
      toastStore.error('Network error during checkout.');
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
          `<tr>
            <td class="item-name">${item.name}${item.flavor ? ` (${item.flavor})` : ''} (${item.quantity} ${item.unitType})</td>
            <td class="right">${formatCurrency(item.lineTotal)}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <title>${rcpt.receiptNo}</title>
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
      <p>Receipt: ${rcpt.receiptNo}</p>
      <p>${new Date(rcpt.issuedAt).toLocaleString()}</p>
    </div>
    <hr />
    <table>${lineRows}</table>
    <div class="totals">
      <table>
        <tr><td>Subtotal:</td><td class="right">${formatCurrency(rcpt.subtotal)}</td></tr>
        <tr><td>Tax:</td><td class="right">${formatCurrency(rcpt.tax)}</td></tr>
        <tr class="grand-total"><td class="bold">TOTAL:</td><td class="right bold">${formatCurrency(rcpt.total)}</td></tr>
      </table>
    </div>
    <hr />
    <p class="small center">Payment Method: ${rcpt.paymentMethod}</p>
    <p class="center" style="margin-top: 10px; font-weight: bold;">THANK YOU!</p>
  </body>
</html>`;

    receiptHtml = html;
    showReceipt = true;
  }

  let receiptHtml = $state('');

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
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Today's Returns</p>
        <p class="mt-0.5 text-lg font-bold text-red-600">{data.todayReturns || 0}</p>
      </article>
      <article class="rounded-xl bg-amber-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Active Items</p>
        <p class="mt-0.5 text-lg font-bold text-amber-700">{products.length}</p>
      </article>
      <article class="rounded-xl bg-sky-50 p-2">
        <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">Categories</p>
        <p class="mt-0.5 text-lg font-bold text-sky-700">
          {Math.max(0, categories.length - 1)}
        </p>
        <p class="mt-1 text-[9px] text-slate-500">
          Total active categories
        </p>
      </article>
    </div>


    <div class="flex items-center gap-3 border-b border-primary/10 p-3">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input 
          id="product-search-input"
          class="w-full rounded-full border border-primary/20 bg-slate-50 py-1.5 pl-9 pr-4 text-sm focus:border-primary focus:bg-white focus:outline-none"
          placeholder="Scan barcode or search..."
          bind:value={searchQuery}
          onkeydown={handleSearchEnter}
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
          onclick={() => { selectedCategoryId = category.name === 'All Items' ? 0 : category.id; selectedFlavor = ''; }}
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
          onclick={() => (selectedFlavor = '')}
        >
          All Subcategories
        </button>
        {#each categoryFlavors as flavor}
          <button
            class={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
              selectedFlavor === flavor ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
            }`}
            onclick={() => (selectedFlavor = flavor)}
          >
            {flavor}
          </button>
        {/each}
      </div>
    {/if}

    <div class="no-scrollbar grid grid-cols-2 gap-2 overflow-y-auto p-3 md:grid-cols-4 xl:grid-cols-6">
      {#if filteredProducts.length === 0}
        <div class="col-span-full flex flex-col items-center justify-center py-12 px-4">
          <img src="/no_products_provided.png" alt="No products found" class="w-72 h-72 object-contain mb-2 animate-in fade-in zoom-in duration-500" />
          <p class="text-sm font-medium text-slate-500 text-center">Try changing the category or search query.</p>
        </div>
      {:else}
        {#each filteredProducts as product}
          <button
            class="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-primary/10 bg-white text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            onclick={() => updateCart(product.id, 1)}
            disabled={cartLoading}
          >
            <div class="relative aspect-[4/3] overflow-hidden bg-slate-50 border-b border-primary/10">
              <img
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={product.imageUrl || '/assets/checkout-screen.png'}
                alt={product.name}
                onerror={(e) => (e.currentTarget.src = '/assets/checkout-screen.png')}
              />
            </div>
            <div class="p-2 flex flex-col justify-between flex-1 bg-gradient-to-b from-white to-slate-50/50">
              <h3 class="text-[11px] font-bold text-slate-800 leading-tight">
                {product.name}
                {#if product.flavor}
                  <span class="text-[9px] font-medium text-slate-400 block mt-0.5">{product.flavor}</span>
                {/if}
              </h3>
              <div class="mt-2 flex items-center justify-between">
                <p class="text-[11px] font-black text-primary">{formatCurrency(product.price)}</p>
                <div class="rounded-full bg-primary/10 p-1 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span class="material-symbols-outlined !text-xs">add</span>
                </div>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>

  </section>

  <aside class="hidden w-full max-w-[400px] flex-col border-l border-primary/10 bg-white shadow-xl lg:flex h-[calc(100vh-69px)]">
    <div class="border-b border-primary/5 p-4 shrink-0">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-xl font-bold text-slate-900">Current Order</h2>
        <button class="text-primary" onclick={clearOrder} disabled={cartLoading}>
          <span class="material-symbols-outlined">delete_sweep</span>
        </button>
      </div>
      <p class="text-sm text-slate-500 font-mono">{cart.orderNo} • {cart.customerName}</p>
    </div>

    <div class="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
      {#if !cart.items.length}
        <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div class="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-slate-600 mb-6 w-full">
            Cart is empty. Tap a product card to add items.
          </div>
          <img src="/empty_cart_illustration.png" alt="Empty Cart" class="w-32 h-32 object-contain animate-in fade-in slide-in-from-bottom-4 duration-700" />
        </div>
      {/if}

      {#each cart.items as item}
        <div class="group flex items-center gap-4">
          <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            <img 
              class="h-full w-full object-cover" 
              src={item.imageUrl || '/assets/checkout-screen.png'} 
              alt={item.name} 
              onerror={(e) => (e.currentTarget.src = '/assets/checkout-screen.png')}
            />
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
              class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 transition-all"
              onclick={() => updateCart(item.productId, -getStepByUnit(item.unitType))}
              disabled={cartLoading}
            >
              <span class="material-symbols-outlined text-base">remove</span>
            </button>
            <span class="w-12 text-center text-sm font-bold">{item.quantity} {item.unitType}</span>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 transition-all"
              onclick={() => updateCart(item.productId, getStepByUnit(item.unitType))}
              disabled={cartLoading}
            >
              <span class="material-symbols-outlined text-base">add</span>
            </button>
          </div>
          <div class="min-w-[70px] text-right">
            <p class="text-sm font-bold text-slate-800">{formatCurrency(item.lineTotal)}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="space-y-2 bg-primary/5 p-4">
      {#if cart.items.length > 0}
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
                onclick={() => setPaymentMethod(method)}
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
          <span class="text-slate-500">Tax ({Math.round(data.taxRate * 100)}%)</span>
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
        <div class="flex items-end justify-between border-t border-primary/10 pt-2 mb-2">
          <span class="text-sm font-bold text-slate-900">Total</span>
          <span class="text-lg font-black text-primary">{formatCurrency(payableTotal)}</span>
        </div>
      {/if}

      <button
        class="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 inline-flex items-center justify-center gap-2 active:scale-95 transition-all disabled:cursor-not-allowed"
        onclick={completeSale}
        disabled={cartLoading || cart.items.length === 0}
      >
        {#if cartLoading}
          <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          Processing...
        {:else}
          Complete Sale
        {/if}
      </button>
    </div>
  </aside>
</main>

{#if showReceipt}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="bg-slate-50 border-b border-primary/10 p-4 flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-900">Print Receipt</h3>
        <button class="text-slate-400 hover:text-red-500 transition-colors" onclick={() => (showReceipt = false)}>
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
        <button class="rounded-xl border border-primary px-3 py-4 font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50" onclick={triggerPrint} disabled={cartLoading}>
          {#if cartLoading}
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          {:else}
            <span class="material-symbols-outlined text-sm">print</span>
            Print
          {/if}
        </button>
        <button class="rounded-xl bg-primary px-3 py-4 font-bold text-white hover:bg-primary-dark transition-colors active:scale-95" onclick={() => (showReceipt = false)}>
          Done
        </button>
      </div>
    </div>
  </div>
{/if}

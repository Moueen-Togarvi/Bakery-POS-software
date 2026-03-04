<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';

  type Category = { id: number; name: string };
  type InventoryRow = {
    id: number;
    name: string;
    category: string;
    unitPrice: number;
    stock: number;
    reorderLevel: number;
    status: string;
    sku: string | null;
    unitType: string;
    flavor: string | null;
  };

  export let data: PageData;

  let rows: InventoryRow[] = data.rows;
  let categories: Category[] = data.categories.filter((c) => c.id !== 0);
  let dbOffline = data.dbOffline;
  let dbMessage = data.dbMessage;
  let infoMessage = '';
  let busy = false;

  let categoryName = '';
  let productName = '';
  let productPrice = '';
  let productImage = '';
  let productStock = '';
  let productSku = '';
  let productFlavor = '';
  let productUnitType = 'pcs';
  let selectedCategoryId = categories[0]?.id ?? 1;

  async function refreshInventory() {
    const res = await fetch('/api/inventory');
    const body = await res.json();
    rows = body.rows;
    categories = (body.categories as Category[]).filter((c) => c.id !== 0);
    dbOffline = Boolean(body.dbOffline);
    if (!categories.some((c) => c.id === selectedCategoryId)) {
      selectedCategoryId = categories[0]?.id ?? 1;
    }
  }

  async function addCategory() {
    const name = categoryName.trim();
    if (!name) {
      infoMessage = 'Category name required.';
      return;
    }
    busy = true;
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const body = await res.json();
      if (!res.ok) {
        infoMessage = body.message ?? 'Category add failed.';
        return;
      }
      categoryName = '';
      infoMessage = 'Category added successfully.';
      await refreshInventory();
    } finally {
      busy = false;
    }
  }

  async function addProduct() {
      const name = productName.trim();
      const price = Number(productPrice);

      if (!name) {
          infoMessage = 'Product name required.';
          return;
      }
      if (!Number.isFinite(price) || price < 0) {
          infoMessage = 'Valid product price required.';
          return;
      }

      busy = true;
      try {
          const res = await fetch('/api/inventory/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name,
                  categoryId: selectedCategoryId,
                  price,
                  imageUrl: productImage,
                  stock: Number(productStock || 0),
                  sku: productSku || null,
                  unitType: productUnitType,
                  flavor: productFlavor || null
              })
          });
          const body = await res.json();
          if (!res.ok) {
              infoMessage = body.message ?? 'Product add failed.';
              return;
          }

          productName = '';
          productPrice = '';
          productImage = '';
          productStock = '';
          productSku = '';
          productFlavor = '';
          productUnitType = 'pcs';
          infoMessage = 'Product added successfully.';
          await refreshInventory();
      } finally {
          busy = false;
      }
  }

  async function handleFileUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        productImage = data.url;
      } else {
        alert('Upload failed');
      }
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Inventory | OvenFresh POS</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-3 md:p-4 text-sm bg-slate-50/50">
    <section class="max-w-6xl mx-auto space-y-4">
        <!-- Add Category & Item Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Add Category -->
            <div class="bg-white rounded-2xl shadow-sm p-4 border border-primary/10">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-tight mb-3">Add Category</h3>
                <div class="flex gap-2">
                    <input
                        class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none transition-all"
                        placeholder="e.g. Biscuits"
                        bind:value={categoryName}
                    />
                    <button class="rounded-lg bg-primary px-4 py-1.5 font-bold text-white text-xs hover:bg-primary-dark transition-colors" on:click={addCategory} disabled={busy}>
                        Add
                    </button>
                </div>
            </div>

            <!-- Add Product -->
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 border border-primary/10">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-tight mb-3">Quick Add Product</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="space-y-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                            <input class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none" placeholder="Product name" bind:value={productName} />
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                            <select class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none bg-white" bind:value={selectedCategoryId}>
                                {#each categories as category}
                                    <option value={category.id}>{category.name}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price</label>
                                <input class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none" placeholder="0.00" type="number" bind:value={productPrice} />
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock</label>
                                <input class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none" placeholder="0" type="number" bind:value={productStock} />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Flavor</label>
                                <input class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none" placeholder="e.g. Vanilla" bind:value={productFlavor} />
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
                                <select class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none bg-white" bind:value={productUnitType}>
                                    <option value="pcs">pcs</option>
                                    <option value="kg">kg</option>
                                    <option value="lb">lb</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Barcode / Image</label>
                            <input class="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none mb-1 text-[11px]" placeholder="SKU/Barcode" bind:value={productSku} />
                            <div class="flex items-center gap-2">
                                <input type="file" accept="image/*" class="hidden" id="fileInput" on:change={handleFileUpload} />
                                <label for="fileInput" class="cursor-pointer text-[10px] font-bold text-primary hover:underline">
                                    {productImage ? '✓ Image uploaded' : '+ Upload Image'}
                                </label>
                            </div>
                        </div>
                        <button class="w-full rounded-lg bg-primary py-2.5 font-bold text-white text-xs hover:bg-primary-dark transition-colors shadow-sm" on:click={addProduct} disabled={busy}>
                            Save Product
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Inventory List -->
        <div class="bg-white rounded-2xl shadow-sm border border-primary/10 overflow-hidden">
            <div class="p-4 border-b border-primary/5 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-slate-900">Live Inventory</h2>
                    <p class="text-[11px] text-slate-500">Real-time stock management</p>
                </div>
                <div class="flex items-center gap-3">
                    <button class="rounded-lg border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors" on:click={refreshInventory}>
                        Refresh
                    </button>
                    <span class={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${dbOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                        {dbOffline ? 'Sample Mode' : 'Live Mode'}
                    </span>
                </div>
            </div>

            {#if dbOffline || infoMessage}
                <div class="p-4 pb-0">
                    {#if dbOffline}
                        <div class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 border border-amber-200 mb-2">{dbMessage}</div>
                    {/if}
                    {#if infoMessage}
                        <div class="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 border border-sky-200 mb-2">{infoMessage}</div>
                    {/if}
                </div>
            {/if}

            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3">Product Info</th>
                            <th class="px-4 py-3">Category</th>
                            <th class="px-4 py-3 text-center">Flavor</th>
                            <th class="px-4 py-3 text-right">Price</th>
                            <th class="px-4 py-3 text-center">Stock</th>
                            <th class="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        {#each rows as row}
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="px-4 py-3">
                                    <div class="font-bold text-slate-900">{row.name}</div>
                                    {#if row.sku}
                                        <div class="text-[10px] font-mono text-slate-400">SKU: {row.sku}</div>
                                    {/if}
                                </td>
                                <td class="px-4 py-3">
                                    <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{row.category}</span>
                                </td>
                                <td class="px-4 py-3 text-center text-slate-500 italic text-[11px]">{row.flavor || '-'}</td>
                                <td class="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(row.unitPrice)}</td>
                                <td class="px-4 py-3 text-center">
                                    <span class="font-bold text-slate-900">{row.stock}</span>
                                    <span class="text-[10px] text-slate-400 font-medium ml-0.5">{row.unitType}</span>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class={`inline-block w-20 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${row.status === 'Low' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                        {#if rows.length === 0}
                            <tr>
                                <td colspan="6" class="px-4 py-8 text-center text-slate-400 italic">No inventory records found.</td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</main>

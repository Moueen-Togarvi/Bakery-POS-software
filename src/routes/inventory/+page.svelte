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
  let selectedCategoryId = categories[0]?.id ?? 1;

  async function refreshInventory() {
    const res = await fetch('/api/inventory');
    const body = await res.json();
    rows = body.rows;
    categories = (body.categories as Category[]).filter((c) => c.id !== 0);
    dbOffline = Boolean(body.dbOffline);
    if (dbOffline) {
      dbMessage = 'Inventory currently sample backend mode mein chal raha hai.';
    }
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
      infoMessage = body.dbOffline
        ? 'Category added in sample mode.'
        : 'Category added successfully.';
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
          imageUrl: productImage
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
      infoMessage = body.dbOffline
        ? 'Product added in sample mode.'
        : 'Product added successfully.';
      await refreshInventory();
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Inventory | OvenFresh POS</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] space-y-4 p-4 md:p-6">
  <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <article class="rounded-2xl bg-white p-5 shadow-sm">
      <h3 class="text-lg font-bold text-slate-900">Add Category</h3>
      <p class="mt-1 text-sm text-slate-500">Create new product categories</p>
      <div class="mt-4 flex gap-3">
        <input
          class="w-full rounded-lg border border-primary/20 px-3 py-2"
          placeholder="e.g. Cookies"
          bind:value={categoryName}
        />
        <button class="rounded-lg bg-primary px-4 py-2 font-semibold text-white" on:click={addCategory} disabled={busy}>
          Add
        </button>
      </div>
    </article>

    <article class="rounded-2xl bg-white p-5 shadow-sm">
      <h3 class="text-lg font-bold text-slate-900">Add Inventory Item</h3>
      <p class="mt-1 text-sm text-slate-500">Create new product under category</p>
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input class="rounded-lg border border-primary/20 px-3 py-2" placeholder="Product name" bind:value={productName} />
        <input class="rounded-lg border border-primary/20 px-3 py-2" placeholder="Price" bind:value={productPrice} type="number" min="0" step="0.01" />
        <select class="rounded-lg border border-primary/20 px-3 py-2" bind:value={selectedCategoryId}>
          {#each categories as category}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
        <input class="rounded-lg border border-primary/20 px-3 py-2" placeholder="Image URL (optional)" bind:value={productImage} />
      </div>
      <button class="mt-3 rounded-lg bg-primary px-4 py-2 font-semibold text-white" on:click={addProduct} disabled={busy}>
        Add Product
      </button>
    </article>
  </section>

  <section class="rounded-2xl bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Inventory Dashboard</h2>
        <p class="text-sm text-slate-500">Live stock snapshot for bakery items</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary" on:click={refreshInventory}>
          Refresh
        </button>
        <span class={`rounded-full px-3 py-1 text-xs font-semibold ${dbOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          {dbOffline ? 'Sample Mode' : 'Live Mode'}
        </span>
      </div>
    </div>

    {#if dbOffline}
      <div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dbMessage}</div>
    {/if}

    {#if infoMessage}
      <div class="mb-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">{infoMessage}</div>
    {/if}

    <div class="overflow-x-auto rounded-xl border border-primary/10">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-primary/10 text-slate-700">
          <tr>
            <th class="px-4 py-3">Item</th>
            <th class="px-4 py-3">Category</th>
            <th class="px-4 py-3">Unit Price</th>
            <th class="px-4 py-3">Stock</th>
            <th class="px-4 py-3">Reorder</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr class="border-t border-primary/5">
              <td class="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
              <td class="px-4 py-3 text-slate-600">{row.category}</td>
              <td class="px-4 py-3 text-slate-600">{formatCurrency(row.unitPrice)}</td>
              <td class="px-4 py-3 text-slate-700">{row.stock}</td>
              <td class="px-4 py-3 text-slate-700">{row.reorderLevel}</td>
              <td class="px-4 py-3">
                <span class={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === 'Low' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>

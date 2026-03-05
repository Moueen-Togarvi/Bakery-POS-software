<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';

  type Category = { id: number; name: string };
  type InventoryRow = {
    id: number;
    name: string;
    category: string;
    imageUrl: string | null;
    unitPrice: number;
    buyingPrice: number;
    unitProfit: number;
    stock: number;
    reorderLevel: number;
    status: string;
    sku: string | null;
    unitType: string;
    flavor: string | null;
  };

  export let data: PageData;
  const storeName = data.storeName ?? 'OvenFresh POS';

  let rows: InventoryRow[] = data.rows;
  let categories: Category[] = data.categories.filter((c) => c.id !== 0);
  let dbOffline = data.dbOffline;
  let dbMessage = data.dbMessage;
  let infoMessage = '';
  let busy = false;

  let categoryName = '';
  let productName = '';
  let productSellingPrice = '';
  let productBuyingPrice = '';
  let productImage = '';
  let productStock = '';
  let productSku = '';
  let productFlavor = '';
  let productUnitType = 'pcs';
  let selectedCategoryId = categories[0]?.id ?? 1;
  let editModalOpen = false;
  let editProductId: number | null = null;
  let editProductName = '';
  let editSellingPrice = '';
  let editBuyingPrice = '';
  let editImage = '';
  let editStock = '';
  let editSku = '';
  let editFlavor = '';
  let editUnitType = 'pcs';
  let editCategoryId = categories[0]?.id ?? 1;
  const unitOptions = ['pcs', 'dozen', 'slice', 'loaf', 'tray', 'box', 'pack', 'kg', 'g', 'lb', 'oz', 'liter', 'ml'];
  let searchDraft = '';
  let searchTerm = '';

  $: filteredRows = rows.filter((row) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q) ||
      (row.sku || '').toLowerCase().includes(q) ||
      (row.flavor || '').toLowerCase().includes(q)
    );
  });

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

  function resetProductForm() {
      productName = '';
      productSellingPrice = '';
      productBuyingPrice = '';
      productImage = '';
      productStock = '';
      productSku = '';
      productFlavor = '';
      productUnitType = 'pcs';
  }

  function startEdit(row: InventoryRow) {
      editProductId = row.id;
      editProductName = row.name;
      editSellingPrice = String(row.unitPrice ?? '');
      editBuyingPrice = String(row.buyingPrice ?? 0);
      editImage = row.imageUrl ?? '';
      editStock = String(row.stock ?? 0);
      editSku = row.sku ?? '';
      editFlavor = row.flavor ?? '';
      editUnitType = row.unitType ?? 'pcs';

      const matchedCategory = categories.find((c) => c.name === row.category);
      editCategoryId = matchedCategory?.id ?? selectedCategoryId;
      editModalOpen = true;
      infoMessage = '';
  }

  async function saveProduct() {
      const name = productName.trim();
      const price = Number(productSellingPrice);
      const buyingPrice = Number(productBuyingPrice || 0);

      if (!name) {
          infoMessage = 'Product name required.';
          return;
      }
      if (!Number.isFinite(price) || price < 0) {
          infoMessage = 'Valid selling price required.';
          return;
      }
      if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {
          infoMessage = 'Valid buying price required.';
          return;
      }

      busy = true;
      try {
          const skuValue = productSku.trim() || null;
          const res = await fetch('/api/inventory/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name,
                  categoryId: selectedCategoryId,
                  price,
                  buyingPrice,
                  imageUrl: productImage,
                  stock: Number(productStock || 0),
                  sku: skuValue,
                  unitType: productUnitType,
                  flavor: productFlavor || null
              })
          });
          const body = await res.json();
          if (!res.ok) {
              console.error('Save product error:', body);
              infoMessage = body.message ?? 'Product add failed.';
              return;
          }

          resetProductForm();
          infoMessage = 'Product added successfully.';
          await refreshInventory();
      } catch (err) {
          console.error('Network/Save error:', err);
          infoMessage = 'Network error while saving product.';
      } finally {
          busy = false;
      }
  }

  async function saveEditedProduct() {
    if (!editProductId) return;

    const name = editProductName.trim();
    const price = Number(editSellingPrice);
    const buyingPrice = Number(editBuyingPrice || 0);

    if (!name) {
      infoMessage = 'Product name required.';
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      infoMessage = 'Valid selling price required.';
      return;
    }
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {
      infoMessage = 'Valid buying price required.';
      return;
    }

    busy = true;
    try {
      const skuValue = editSku.trim() || null;
      const res = await fetch('/api/inventory/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProductId,
          name,
          categoryId: editCategoryId,
          price,
          buyingPrice,
          imageUrl: editImage,
          stock: Number(editStock || 0),
          sku: skuValue,
          unitType: editUnitType,
          flavor: editFlavor || null
        })
      });
      const body = await res.json();
      if (!res.ok) {
        console.error('Update product error:', body);
        infoMessage = body.message ?? 'Product update failed.';
        return;
      }

      editModalOpen = false;
      editProductId = null;
      infoMessage = 'Product updated successfully.';
      await refreshInventory();
    } catch (err) {
      console.error('Update error:', err);
      infoMessage = 'Network error while updating product.';
    } finally {
      busy = false;
    }
  }

  async function removeProduct(id: number, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;

    busy = true;
    try {
      const res = await fetch('/api/inventory/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const body = await res.json();
      if (!res.ok) {
        infoMessage = body.message ?? 'Delete failed.';
        return;
      }
      if (editProductId === id) {
        editModalOpen = false;
        editProductId = null;
      }
      infoMessage = 'Product deleted successfully.';
      await refreshInventory();
    } finally {
      busy = false;
    }
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
            },
            'image/jpeg',
            0.7
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
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
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      busy = false;
    }
  }

  async function handleEditFileUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        editImage = data.url;
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + (err as Error).message);
    } finally {
      busy = false;
    }
  }

  function runSearch() {
    searchTerm = searchDraft;
  }

  let barcodeBuffer = '';
  let barcodeTimeout: ReturnType<typeof setTimeout>;

  function triggerBarcode() {
    const code = barcodeBuffer.trim();
    barcodeBuffer = '';
    if (code.length > 2) {
      if (editModalOpen) {
          editSku = code;
      } else {
          productSku = code;
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    if (event.key === 'Enter') {
       if (barcodeBuffer.length > 0) {
           clearTimeout(barcodeTimeout);
           triggerBarcode();
       }
       return;
    }
    
    if (event.key.length === 1) {
      barcodeBuffer += event.key;
      clearTimeout(barcodeTimeout);
      barcodeTimeout = setTimeout(triggerBarcode, 150);
    }
  }

  import { onMount } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<svelte:head>
  <title>Inventory | {storeName}</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-3 md:p-4 text-sm bg-slate-50/50">
    <section class="w-full space-y-4">
        <!-- Add Category & Item Row -->
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
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
            <div class="xl:col-span-3 bg-white rounded-2xl shadow-sm p-4 border border-primary/10">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-tight mb-3">
                  Quick Add Product
                </h3>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div class="md:col-span-4">
                        <label for="product-name" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</label>
                        <input id="product-name" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" placeholder="Product name" bind:value={productName} />
                    </div>
                    <div class="md:col-span-3">
                        <label for="product-category" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                        <select id="product-category" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-primary" bind:value={selectedCategoryId}>
                            {#each categories as category}
                                <option value={category.id}>{category.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-unit" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</label>
                        <select id="product-unit" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-primary" bind:value={productUnitType}>
                            {#each unitOptions as unit}
                                <option value={unit}>{unit}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="md:col-span-3">
                        <label for="product-sku" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Barcode</label>
                        <input id="product-sku" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-primary" placeholder="SKU/Barcode" bind:value={productSku} />
                    </div>

                    <div class="md:col-span-2">
                        <label for="product-buying-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buying Price</label>
                        <input id="product-buying-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" placeholder="0.00" type="number" bind:value={productBuyingPrice} />
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-selling-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling Price</label>
                        <input id="product-selling-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" placeholder="0.00" type="number" bind:value={productSellingPrice} />
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-stock" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</label>
                        <input id="product-stock" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" placeholder="0" type="number" bind:value={productStock} />
                    </div>
                    <div class="md:col-span-1">
                        <label for="product-flavor" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Flavor</label>
                        <input id="product-flavor" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" placeholder="e.g. Vanilla" bind:value={productFlavor} />
                    </div>
                    <div class="md:col-span-5">
                        <p class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Image</p>
                        <div class="flex items-center gap-2">
                            <input type="file" accept="image/*" class="hidden" id="fileInput" on:change={handleFileUpload} />
                            <label for="fileInput" class="cursor-pointer rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[10px] font-bold text-primary hover:bg-primary/10">
                                Upload Image
                            </label>
                            <input class="h-[34px] flex-1 rounded-md border border-slate-200 px-2 text-[11px] text-slate-600" readonly value={productImage ? 'Image linked' : 'No image selected'} />
                        </div>
                    </div>

                    <div class="md:col-span-12">
                        <div class="flex justify-end gap-2">
                          <button class="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-dark" on:click={saveProduct} disabled={busy}>
                              Save Product
                          </button>
                        </div>
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
                <div class="flex items-center gap-2">
                    <input
                      class="w-52 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-primary"
                      placeholder="Search product, SKU, flavor..."
                      bind:value={searchDraft}
                      on:keydown={(e) => e.key === 'Enter' && runSearch()}
                    />
                    <button class="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors" on:click={runSearch}>
                        Search
                    </button>
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
                            <th class="px-4 py-3 text-right">Buying</th>
                            <th class="px-4 py-3 text-right">Selling</th>
                            <th class="px-4 py-3 text-right">Profit/Unit</th>
                            <th class="px-4 py-3 text-center">Stock</th>
                            <th class="px-4 py-3 text-center">Status</th>
                            <th class="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        {#each filteredRows as row}
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
                                <td class="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(row.buyingPrice)}</td>
                                <td class="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(row.unitPrice)}</td>
                                <td class="px-4 py-3 text-right font-bold {row.unitProfit < 0 ? 'text-red-600' : 'text-emerald-600'}">{formatCurrency(row.unitProfit)}</td>
                                <td class="px-4 py-3 text-center">
                                    <span class="font-bold text-slate-900">{row.stock}</span>
                                    <span class="text-[10px] text-slate-400 font-medium ml-0.5">{row.unitType}</span>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class={`inline-block w-20 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${row.status === 'Low' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-center">
                                  <div class="inline-flex items-center gap-1">
                                    <button class="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100" on:click={() => startEdit(row)} disabled={busy}>
                                      Edit
                                    </button>
                                    <button class="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100" on:click={() => removeProduct(row.id, row.name)} disabled={busy}>
                                      Delete
                                    </button>
                                  </div>
                                </td>
                            </tr>
                        {/each}
                        {#if filteredRows.length === 0}
                            <tr>
                                <td colspan="10" class="px-4 py-8 text-center text-slate-400 italic">No inventory records found.</td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</main>

{#if editModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
      <h3 class="text-lg font-bold text-slate-900 mb-4">Edit Product</h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div class="md:col-span-4">
          <label for="edit-product-name" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</label>
          <input id="edit-product-name" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" bind:value={editProductName} />
        </div>
        <div class="md:col-span-3">
          <label for="edit-product-category" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
          <select id="edit-product-category" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-primary" bind:value={editCategoryId}>
            {#each categories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        <div class="md:col-span-2">
          <label for="edit-product-unit" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</label>
          <select id="edit-product-unit" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-primary" bind:value={editUnitType}>
            {#each unitOptions as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>
        <div class="md:col-span-3">
          <label for="edit-product-sku" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Barcode</label>
          <input id="edit-product-sku" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-primary" bind:value={editSku} />
        </div>

        <div class="md:col-span-2">
          <label for="edit-buying-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buying Price</label>
          <input id="edit-buying-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" type="number" bind:value={editBuyingPrice} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-selling-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling Price</label>
          <input id="edit-selling-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" type="number" bind:value={editSellingPrice} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-stock" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</label>
          <input id="edit-stock" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" type="number" bind:value={editStock} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-flavor" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Flavor</label>
          <input id="edit-flavor" class="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary" bind:value={editFlavor} />
        </div>
        <div class="md:col-span-4">
          <p class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Image</p>
          <div class="flex items-center gap-2">
            <input type="file" accept="image/*" class="hidden" id="editFileInput" on:change={handleEditFileUpload} />
            <label for="editFileInput" class="cursor-pointer rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[10px] font-bold text-primary hover:bg-primary/10">
              Upload Image
            </label>
            <input class="h-[34px] flex-1 rounded-md border border-slate-200 px-2 text-[11px] text-slate-600" readonly value={editImage ? 'Image linked' : 'No image selected'} />
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50" on:click={() => (editModalOpen = false)} disabled={busy}>
          Cancel
        </button>
        <button class="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-dark" on:click={saveEditedProduct} disabled={busy}>
          Update Product
        </button>
      </div>
    </div>
  </div>
{/if}

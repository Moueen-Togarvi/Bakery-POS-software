<script lang="ts">
  import type { PageData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { toastStore } from '$lib/stores/toast.svelte';

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

  let { data } = $props();
  const storeName = $derived(data.storeName ?? 'OvenFresh POS');

  let rows = $state<InventoryRow[]>(data.rows);
  let categories = $state<Category[]>(data.categories.filter((c) => c.id !== 0));
  let dbOffline = $state(data.dbOffline);
  let dbMessage = $state(data.dbMessage);
  let busy = $state(false);
  let uploading = $state(false);

  let categoryName = $state('');
  let productName = $state('');
  let productSellingPrice = $state('');
  let productBuyingPrice = $state('');
  let productImage = $state('');
  let productStock = $state('');
  let productSku = $state('');
  let productFlavor = $state('');
  let productUnitType = $state('pcs');
  let selectedCategoryId = $state(categories[0]?.id ?? 1);
  let editModalOpen = $state(false);
  let editProductId = $state<number | null>(null);
  let editProductName = $state('');
  let editSellingPrice = $state('');
  let editBuyingPrice = $state('');
  let editImage = $state('');
  let editStock = $state('');
  let editSku = $state('');
  let editFlavor = $state('');
  let editUnitType = $state('pcs');
  let editCategoryId = $state(categories[0]?.id ?? 1);
  const unitOptions = ['pcs', 'dozen', 'slice', 'loaf', 'tray', 'box', 'pack', 'kg', 'g', 'lb', 'oz', 'liter', 'ml'];
  let searchDraft = $state('');
  let searchTerm = $state('');

  // Category Edit/Delete Modal States
  let categoryEditModalOpen = $state(false);
  let categoryDeleteModalOpen = $state(false);
  let categoryToEdit = $state<Category | null>(null);
  let categoryToDelete = $state<Category | null>(null);
  let newCategoryName = $state('');

  // Product Delete Modal States
  let productDeleteModalOpen = $state(false);
  let productToDelete = $state<InventoryRow | null>(null);

  let filteredRows = $derived(rows.filter((row) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q) ||
      (row.sku || '').toLowerCase().includes(q) ||
      (row.flavor || '').toLowerCase().includes(q)
    );
  }));

  async function refreshInventory() {
    busy = true;
    try {
      const res = await fetch('/api/inventory');
      const body = await res.json();
      rows = body.rows;
      categories = (body.categories as Category[]).filter((c) => c.id !== 0);
      dbOffline = Boolean(body.dbOffline);
      if (!categories.some((c) => c.id === selectedCategoryId)) {
        selectedCategoryId = categories[0]?.id ?? 1;
      }
    } finally {
      busy = false;
    }
  }

  async function addCategory() {
    const name = categoryName.trim();
    if (!name) {
      toastStore.error('Category name required.');
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
        toastStore.error(body.message ?? 'Category add failed.');
        return;
      }
      categoryName = '';
      toastStore.success('Category added successfully.');
      await refreshInventory();
    } finally {
      busy = false;
    }
  }

  function openCategoryEdit(cat: Category) {
    categoryToEdit = cat;
    newCategoryName = cat.name;
    categoryEditModalOpen = true;
  }

  async function performCategoryUpdate() {
    if (!categoryToEdit || !newCategoryName.trim() || newCategoryName.trim() === categoryToEdit.name) {
      categoryEditModalOpen = false;
      return;
    }

    busy = true;
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryToEdit.id, name: newCategoryName.trim() })
      });
      const body = await res.json();
      if (!res.ok) {
        toastStore.error(body.message ?? 'Update failed.');
        return;
      }
      toastStore.success('Category updated.');
      categoryEditModalOpen = false;
      await refreshInventory();
    } finally {
      busy = false;
    }
  }

  function openCategoryDelete(cat: Category) {
    categoryToDelete = cat;
    categoryDeleteModalOpen = true;
  }

  async function performCategoryDelete() {
    if (!categoryToDelete) return;

    busy = true;
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryToDelete.id })
      });
      const body = await res.json();
      if (!res.ok) {
        toastStore.error(body.message ?? 'Delete failed.');
        return;
      }
      toastStore.success('Category deleted.');
      categoryDeleteModalOpen = false;
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
  }

  async function saveProduct() {
      const name = productName.trim();
      const price = Number(productSellingPrice);
      const buyingPrice = Number(productBuyingPrice || 0);

      if (!name) {
          toastStore.error('Product name is required.');
          return;
      }
      if (!selectedCategoryId) {
          toastStore.error('Please select a category.');
          return;
      }
      if (!productFlavor.trim()) {
          toastStore.error('Flavor is required.');
          return;
      }
      if (!Number.isFinite(price) || price <= 0) {
          toastStore.error('Valid selling price is required.');
          return;
      }
      if (!Number.isFinite(buyingPrice) || buyingPrice <= 0) {
          toastStore.error('Valid buying price is required.');
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
              toastStore.error(body.message ?? 'Product add failed.');
              return;
          }

          resetProductForm();
          toastStore.success('Product added successfully!');
          await refreshInventory();
      } catch (err) {
          console.error('Network/Save error:', err);
          toastStore.error('Network error while saving product.');
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
      toastStore.error('Product name is required.');
      return;
    }
    if (!editCategoryId) {
      toastStore.error('Please select a category.');
      return;
    }
    if (!editFlavor.trim()) {
      toastStore.error('Flavor is required.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toastStore.error('Valid selling price is required.');
      return;
    }
    if (!Number.isFinite(buyingPrice) || buyingPrice <= 0) {
      toastStore.error('Valid buying price is required.');
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
        toastStore.error(body.message ?? 'Product update failed.');
        return;
      }

      editModalOpen = false;
      editProductId = null;
      toastStore.success('Product updated successfully.');
      await refreshInventory();
    } catch (err) {
      console.error('Update error:', err);
      toastStore.error('Network error while updating product.');
    } finally {
      busy = false;
    }
  }

  function openProductDelete(row: InventoryRow) {
    productToDelete = row;
    productDeleteModalOpen = true;
  }

  async function performProductDelete() {
    if (!productToDelete) return;

    busy = true;
    try {
      const res = await fetch('/api/inventory/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productToDelete.id })
      });
      const body = await res.json();
      if (!res.ok) {
        toastStore.error(body.message ?? 'Delete failed.');
        return;
      }
      if (editProductId === productToDelete.id) {
        editModalOpen = false;
        editProductId = null;
      }
      toastStore.success('Product deleted successfully.');
      productDeleteModalOpen = false;
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
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }

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
    uploading = true;
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
        toastStore.success('Image uploaded successfully!');
      } else {
        toastStore.error('Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toastStore.error('Upload failed: ' + (err as Error).message);
    } finally {
      uploading = false;
    }
  }

  async function handleEditFileUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
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
        toastStore.success('Image updated successfully!');
      } else {
        toastStore.error('Update failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toastStore.error('Update failed: ' + (err as Error).message);
    } finally {
      uploading = false;
    }
  }

  function runSearch() {
    busy = true;
    searchTerm = searchDraft;
    setTimeout(() => { busy = false; }, 300);
  }

  let barcodeBuffer = $state('');
  let lastBarcodeTime = $state(0);
  let barcodeTimeout: ReturnType<typeof setTimeout>;

  function triggerBarcode() {
    const code = barcodeBuffer.trim();
    barcodeBuffer = '';
    if (code.length > 2) {
      if (editModalOpen) {
          editSku = code;
          toastStore.success('Barcode filled in Edit Modal');
      } else {
          productSku = code;
          toastStore.success('Barcode filled in Quick Add');
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const now = Date.now();
    const diff = now - lastBarcodeTime;
    lastBarcodeTime = now;

    // Physical scanners emit characters very quickly (usually < 20-50ms)
    const isFast = diff < 50;
    
    // Check if focuses is on an input field
    const isInputFocused = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    
    if (event.key === 'Enter') {
       if (barcodeBuffer.length > 0) {
           event.preventDefault(); // Intercept scanner's "Enter"
           clearTimeout(barcodeTimeout);
           triggerBarcode();
       }
       return;
    }
    
    if (event.key.length === 1) {
      // If we detect fast scanning speed, we intercept even if an input is focused
      if (isInputFocused && (isFast || barcodeBuffer.length > 0)) {
        event.preventDefault();
        barcodeBuffer += event.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(triggerBarcode, 100);
      } else if (!isInputFocused) {
        // If no input is focused, always collect into buffer
        barcodeBuffer += event.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(triggerBarcode, 100);
      }
    }
  }

  import { onMount } from 'svelte';
  onMount(() => {
    toastStore.info('Scanner Active: Waiting for barcode...', 2000);
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
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
            <!-- Add Category -->
            <div class="bg-white rounded-2xl shadow-sm p-4 border border-primary/10 flex flex-col h-full">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-tight mb-3">Add Category</h3>
                <div class="flex gap-2 mb-4">
                    <input
                        class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 focus:border-primary outline-none transition-all"
                        placeholder="e.g. Biscuits"
                        bind:value={categoryName}
                    />
                    <button class="rounded-lg bg-primary px-4 py-1.5 font-bold text-white text-xs hover:bg-primary-dark transition-colors inline-flex items-center gap-2" onclick={addCategory} disabled={busy}>
                        {#if busy}
                            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        {:else}
                            Add
                        {/if}
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Manage Categories</p>
                    <div class="space-y-1.5">
                        {#each categories as cat}
                            <div class="group flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10">
                                <span class="font-semibold text-slate-700 text-sm">{cat.name}</span>
                                <div class="flex items-center gap-2">
                                    <button class="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors active:scale-90" title="Edit" onclick={() => openCategoryEdit(cat)}>
                                        <span class="material-symbols-outlined text-base">edit</span>
                                    </button>
                                    <button class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors active:scale-90" title="Delete" onclick={() => openCategoryDelete(cat)}>
                                        <span class="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Add Product -->
            <div class="xl:col-span-3 bg-white rounded-2xl shadow-sm p-4 border border-primary/10">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-tight mb-3">
                  Quick Add Product
                </h3>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div class="md:col-span-3">
                        <label for="product-name" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name <span class="text-red-500">*</span></label>
                        <input id="product-name" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="Product name" bind:value={productName} />
                    </div>
                    <div class="md:col-span-3">
                        <label for="product-category" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category <span class="text-red-500">*</span></label>
                        <select id="product-category" class="w-full h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary" bind:value={selectedCategoryId}>
                            {#each categories as category}
                                <option value={category.id}>{category.name}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="md:col-span-3">
                        <label for="product-unit" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</label>
                        <select id="product-unit" class="w-full h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary" bind:value={productUnitType}>
                            {#each unitOptions as unit}
                                <option value={unit}>{unit}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="md:col-span-3">
                        <label for="product-sku" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Barcode</label>
                        <input id="product-sku" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="SKU/Barcode" bind:value={productSku} />
                    </div>

                    <div class="md:col-span-2">
                        <label for="product-buying-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buying <span class="text-red-500">*</span></label>
                        <input id="product-buying-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="0.00" type="number" bind:value={productBuyingPrice} />
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-selling-price" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling <span class="text-red-500">*</span></label>
                        <input id="product-selling-price" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="0.00" type="number" bind:value={productSellingPrice} />
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-stock" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock <span class="text-red-500">*</span></label>
                        <input id="product-stock" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="0" type="number" bind:value={productStock} />
                    </div>
                    <div class="md:col-span-2">
                        <label for="product-flavor" class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Flavor <span class="text-red-500">*</span></label>
                        <input id="product-flavor" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-primary" placeholder="Vanilla" bind:value={productFlavor} />
                    </div>
                    <div class="md:col-span-4">
                        <p class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Image</p>
                        <div class="flex items-center gap-2">
                            <input type="file" accept="image/*" class="hidden" id="fileInput" onchange={handleFileUpload} />
                            <label for="fileInput" class="cursor-pointer h-[38px] min-w-[100px] rounded-lg border border-primary/20 bg-primary/5 px-3 text-[10px] font-bold text-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
                                {#if uploading}
                                  <div class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                {:else}
                                  <span class="material-symbols-outlined text-sm mr-1">upload</span>
                                  Upload
                                {/if}
                            </label>
                            <input class="h-[38px] w-28 rounded-lg border border-slate-100 bg-slate-50 px-3 text-[10px] text-slate-400 truncate" readonly value={productImage ? 'Image linked ✓' : 'No image'} />
                        </div>
                    </div>

                    <div class="md:col-span-12">
                        <div class="flex justify-end gap-3">
                          <button 
                            type="button" 
                            class="rounded-lg border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors" 
                            onclick={resetProductForm}
                            disabled={busy}
                          >
                            Cancel
                          </button>
                          <button class="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-dark inline-flex items-center gap-2" onclick={saveProduct} disabled={busy}>
                              {#if busy}
                                  <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  Saving...
                              {:else}
                                  Save Product
                              {/if}
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
                      onkeydown={(e) => e.key === 'Enter' && runSearch()}
                    />
                    <button class="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors inline-flex items-center gap-2" onclick={runSearch} disabled={busy}>
                        {#if busy}
                            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        {:else}
                            Search
                        {/if}
                    </button>
                    <button class="rounded-lg border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors inline-flex items-center gap-2" onclick={refreshInventory} disabled={busy}>
                        {#if busy}
                            <div class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        {:else}
                            Refresh
                        {/if}
                    </button>
                    <span class={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${dbOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                        {dbOffline ? 'Sample Mode' : 'Live Mode'}
                    </span>
                </div>
            </div>

            {#if dbOffline}
                <div class="p-4 pb-0">
                    <div class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 border border-amber-200 mb-2">{dbMessage}</div>
                </div>
            {/if}

            <div class="overflow-x-auto">
                <table class="w-full text-left compact-table">
                    <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3">Image</th>
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
                                  <div class="h-10 w-10 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                                    <img 
                                      class="h-full w-full object-cover" 
                                      src={row.imageUrl || '/assets/checkout-screen.png'} 
                                      alt={row.name} 
                                      onerror={(e) => (e.currentTarget.src = '/assets/checkout-screen.png')}
                                    />
                                  </div>
                                </td>
                                <td class="px-4 py-3">
                                    <div class="font-bold text-slate-900">{row.name}</div>
                                    {#if row.sku}
                                        <div class="text-[10px] font-mono text-slate-400">SKU: {row.sku}</div>
                                    {/if}
                                </td>
                                <td class="px-4 py-3">
                                    <span class="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{row.category}</span>
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
                                    <button class="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100" onclick={() => startEdit(row)} disabled={busy}>
                                      Edit
                                    </button>
                                    <button class="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100" onclick={() => openProductDelete(row)} disabled={busy}>
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all duration-300">
    <div class="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-bold text-slate-900">Edit Product</h3>
          <p class="text-[11px] text-slate-500 font-medium">Update item details and stock levels</p>
        </div>
        <button class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all" onclick={() => (editModalOpen = false)}>
          <span class="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div class="md:col-span-3">
          <label for="edit-product-name" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Name <span class="text-red-500">*</span></label>
          <input id="edit-product-name" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" bind:value={editProductName} />
        </div>
        <div class="md:col-span-3">
          <label for="edit-product-category" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Category <span class="text-red-500">*</span></label>
          <select id="edit-product-category" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" bind:value={editCategoryId}>
            {#each categories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        <div class="md:col-span-3">
          <label for="edit-product-unit" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</label>
          <select id="edit-product-unit" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" bind:value={editUnitType}>
            {#each unitOptions as unit}
              <option value={unit}>{unit}</option>
            {/each}
          </select>
        </div>
        <div class="md:col-span-3">
          <label for="edit-product-sku" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Barcode</label>
          <input id="edit-product-sku" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[11px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" bind:value={editSku} />
        </div>

        <div class="md:col-span-2">
          <label for="edit-buying-price" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buying <span class="text-red-500">*</span></label>
          <input id="edit-buying-price" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" type="number" bind:value={editBuyingPrice} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-selling-price" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling <span class="text-red-500">*</span></label>
          <input id="edit-selling-price" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" type="number" bind:value={editSellingPrice} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-stock" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</label>
          <input id="edit-stock" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" type="number" bind:value={editStock} />
        </div>
        <div class="md:col-span-2">
          <label for="edit-flavor" class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Flavor <span class="text-red-500">*</span></label>
          <input id="edit-flavor" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" bind:value={editFlavor} />
        </div>
        <div class="md:col-span-4">
          <p class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Image</p>
          <div class="flex items-center gap-2">
            <input type="file" accept="image/*" class="hidden" id="editFileInput" onchange={handleEditFileUpload} />
            <label for="editFileInput" class="cursor-pointer rounded-xl border border-primary/20 bg-primary/5 px-3 h-[42px] text-[10px] font-bold text-primary hover:bg-primary/10 flex items-center justify-center min-w-[100px] transition-colors">
              {#if uploading}
                <div class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              {:else}
                <span class="material-symbols-outlined text-sm mr-1">upload</span>
                Upload
              {/if}
            </label>
            <input class="h-[42px] w-32 rounded-xl border border-slate-100 bg-slate-50 px-3 text-[11px] text-slate-400 truncate" readonly value={editImage ? 'Image linked ✓' : 'No image'} />
          </div>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button class="min-w-[120px] rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95" onclick={() => (editModalOpen = false)} disabled={busy}>
          Cancel
        </button>
        <button class="min-w-[160px] rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0 active:scale-95 inline-flex items-center justify-center gap-2" onclick={saveEditedProduct} disabled={busy}>
          {#if busy}
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if categoryEditModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" in:fly={{ y: 20, duration: 400 }}>
      <div class="bg-slate-50 border-b border-primary/5 p-5">
        <h3 class="text-lg font-bold text-slate-900">Edit Category</h3>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update naming</p>
      </div>
      <div class="p-6">
        <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Category Name <span class="text-red-500">*</span></label>
        <input class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-primary focus:bg-white outline-none transition-all focus:ring-4 focus:ring-primary/5" bind:value={newCategoryName} />
      </div>
      <div class="bg-slate-50 p-5 flex justify-end gap-3">
        <button class="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600" onclick={() => (categoryEditModalOpen = false)}>Cancel</button>
        <button class="rounded-xl bg-primary px-7 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all inline-flex items-center gap-2" onclick={performCategoryUpdate} disabled={busy}>
          {#if busy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          {:else}
            Save
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if categoryDeleteModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" in:fly={{ y: 20, duration: 400 }}>
      <div class="p-8 text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <span class="material-symbols-outlined text-4xl">delete_forever</span>
        </div>
        <h3 class="text-xl font-bold text-slate-900">Delete Category?</h3>
        <p class="mt-3 text-sm text-slate-500 leading-relaxed italic">Are you sure you want to delete <span class="font-bold text-slate-800">"{categoryToDelete?.name}"</span>? It will only work if the category is empty.</p>
      </div>
      <div class="bg-slate-50 p-6 flex gap-3">
        <button class="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick={() => (categoryDeleteModalOpen = false)}>Cancel</button>
        <button class="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all inline-flex items-center justify-center gap-2" onclick={performCategoryDelete} disabled={busy}>
          {#if busy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Deleting...
          {:else}
            Delete
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if productDeleteModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" in:fly={{ y: 20, duration: 400 }}>
      <div class="p-8 text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <span class="material-symbols-outlined text-4xl">delete</span>
        </div>
        <h3 class="text-xl font-bold text-slate-900">Delete Product?</h3>
        <p class="mt-3 text-sm text-slate-500 leading-relaxed italic">Are you sure you want to delete <span class="font-bold text-slate-800">"{productToDelete?.name}"</span>? This action is permanent.</p>
      </div>
      <div class="bg-slate-50 p-6 flex gap-3">
        <button class="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick={() => (productDeleteModalOpen = false)}>Cancel</button>
        <button class="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all inline-flex items-center justify-center gap-2" onclick={performProductDelete} disabled={busy}>
          {#if busy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Deleting...
          {:else}
            Delete
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}


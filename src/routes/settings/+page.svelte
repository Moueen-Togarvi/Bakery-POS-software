<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import { toastStore } from '$lib/stores/toast.svelte';

  let { data, form } = $props();

  let busy = $state(false);
  let uploading = $state(false);
  let storeName = $state(data.storeName ?? 'OvenFresh POS');
  let logoUrl = $state(data.logoUrl ?? '');
  let taxRate = $state(data.taxRate ?? '20');
</script>

<svelte:head>
  <title>Settings | {storeName}</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <section class="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm border border-primary/10">
    <h2 class="text-2xl font-bold text-slate-900">Store Settings</h2>
    <p class="mt-1 text-sm text-slate-500">Update store branding used across navbar and receipts.</p>

    {#if form?.message}
      <div class={`mt-4 rounded-lg border px-4 py-3 text-sm ${form.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
        {form.message}
      </div>
    {/if}

    <form method="POST" action="?/updateBranding" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; await update(); }; }} class="mt-6 space-y-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-sm font-semibold text-slate-700">Store Name</span>
          <input
            name="storeName"
            class="w-full rounded-lg border border-primary/20 px-3 py-2 outline-none focus:border-primary"
            bind:value={storeName}
            required
          />
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-semibold text-slate-700">Tax Rate (%)</span>
          <input
            name="taxRate"
            class="w-full rounded-lg border border-primary/20 px-3 py-2 outline-none focus:border-primary"
            type="number"
            min="0"
            max="100"
            step="0.1"
            bind:value={taxRate}
            required
          />
        </label>
      </div>

      <div class="space-y-2">
        <span class="text-sm font-semibold text-slate-700">Store Logo</span>
        <div class="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            class="flex-1 rounded-lg border border-primary/20 bg-slate-50 px-4 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary disabled:opacity-50"
            disabled={uploading}
            onchange={async (e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;

              uploading = true;
              try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                  toastStore.error('Logo upload failed');
                  return;
                }
                const upload = await res.json();
                logoUrl = upload.url || '';
                toastStore.success('Logo uploaded successfully!');
              } catch (err) {
                console.error('Upload error:', err);
                toastStore.error('Logo upload failed');
              } finally {
                uploading = false;
              }
            }}
          />
          <input type="hidden" name="logoUrl" value={logoUrl} />
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
        <div class="flex items-center gap-3">
          {#if logoUrl}
            <img src={logoUrl} alt="Store Logo" class="h-12 w-12 rounded-lg border border-slate-200 object-contain bg-white p-1" />
          {:else}
            <div class="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300">
              <span class="material-symbols-outlined">storefront</span>
            </div>
          {/if}
          <p class="text-sm font-bold text-slate-900">{storeName}</p>
        </div>
      </div>

      <button type="submit" class="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white" disabled={busy}>
        {busy ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  </section>
</main>

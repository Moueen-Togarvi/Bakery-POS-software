<svelte:head>
  <title>Settings | OvenFresh POS</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <section class="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
    <h2 class="text-2xl font-bold text-slate-900">POS Settings</h2>
    <p class="mt-1 text-sm text-slate-500">Store-level configuration panel</p>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <label class="space-y-2">
        <span class="text-sm font-semibold text-slate-700">Store Name</span>
        <input class="w-full rounded-lg border border-primary/20 px-3 py-2" value="OvenFresh Bakery" />
      </label>
      <label class="space-y-2">
        <span class="text-sm font-semibold text-slate-700">Tax Rate (%)</span>
        <input class="w-full rounded-lg border border-primary/20 px-3 py-2" value="8" />
      </label>
      <label class="space-y-2">
        <span class="text-sm font-semibold text-slate-700">Currency</span>
        <input class="w-full rounded-lg border border-primary/20 px-3 py-2" value="USD" />
      </label>
      <label class="space-y-2">
        <span class="text-sm font-semibold text-slate-700">Receipt Footer</span>
        <input class="w-full rounded-lg border border-primary/20 px-3 py-2" value="Thank you for shopping with us" />
      </label>
    </div>

    <button class="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-white">Save Settings</button>
  </section>
</main>

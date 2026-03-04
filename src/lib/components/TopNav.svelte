<script lang="ts">
  export let pathname = '/';
  export let logoUrl = '';

  const links = [
    { href: '/', label: 'Sales' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/reports', label: 'Reports' },
    { href: '/management', label: 'Management' },
    { href: '/settings', label: 'Settings' }
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };
</script>

<header class="sticky top-0 z-30 border-b border-primary/10 bg-white">
  <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
    <div class="flex items-center justify-between gap-3">
      <a class="flex items-center gap-3 text-primary" href="/">
        {#if logoUrl}
          <img src={logoUrl} alt="Logo" class="h-10 w-10 object-contain" />
        {:else}
          <span class="material-symbols-outlined text-3xl">bakery_dining</span>
        {/if}
        <h1 class="text-lg font-bold tracking-tight text-slate-900 md:text-xl">OvenFresh POS</h1>
      </a>
      <button class="rounded-lg bg-primary/10 p-2 text-primary md:hidden" aria-label="Notifications">
        <span class="material-symbols-outlined">notifications</span>
      </button>
    </div>

    <nav class="no-scrollbar flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-primary/10 bg-primary/5 p-1 md:gap-3 md:border-none md:bg-transparent md:p-0">
      {#each links as link}
        <a
          href={link.href}
          class={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors md:px-2 md:py-1 ${
            isActive(link.href)
              ? 'bg-primary text-white md:border-b-2 md:border-primary md:bg-transparent md:pb-1 md:text-primary'
              : 'text-slate-600 hover:bg-primary/10 hover:text-primary md:hover:bg-transparent'
          }`}
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <div class="hidden items-center gap-4 md:flex">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online</span>
      </div>
      <button class="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors" aria-label="Notifications">
        <span class="material-symbols-outlined italic">notifications</span>
      </button>
      <div class="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/5 p-0.5">
        <img 
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
          alt="Admin" 
          class="h-full w-full rounded-full object-cover bg-white"
        />
      </div>
    </div>
  </div>
</header>

<script lang="ts">
export let pathname = '/';
export let logoUrl = '';
export let storeName = 'OvenFresh POS';
export let username = '';

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
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 md:px-6">
    <a class="flex items-center gap-3 text-primary" href="/">
      {#if logoUrl}
        <img src={logoUrl} alt="Logo" class="h-10 w-10 object-contain" />
      {:else}
        <span class="material-symbols-outlined text-3xl">bakery_dining</span>
      {/if}
      <h1 class="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{storeName}</h1>
    </a>

    <nav class="no-scrollbar mx-auto flex w-full max-w-[720px] items-center justify-center gap-3 overflow-x-auto rounded-xl border border-primary/10 bg-primary/5 p-1.5">
      {#each links as link}
        <a
          href={link.href}
          aria-current={isActive(link.href) ? 'page' : undefined}
          class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            isActive(link.href)
              ? 'bg-primary text-white shadow-sm shadow-primary/30 hover:bg-primary-dark'
              : 'text-slate-700 hover:bg-primary hover:text-white'
          }`}
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <div class="flex items-center gap-2 justify-self-end">
      <div class="hidden rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 lg:flex lg:flex-row lg:items-center lg:gap-2 lg:leading-tight">
        <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Support</span>
        <a href="mailto:hashim@codedclouds.org" class="text-[11px] font-semibold text-slate-700 hover:text-primary ml-2">
          hashim@codedclouds.org
        </a>
        <a href="tel:+966557385262" class="text-[11px] font-bold text-slate-800 hover:text-primary ml-2">
          +966-557385262
        </a>
      </div>
      <div class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
      <span class="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline">Online</span>
      <span class="max-w-[130px] truncate rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
        {username || 'User'}
      </span>
      <form method="POST" action="/logout">
        <button class="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100" title="Logout">
          <span class="material-symbols-outlined text-sm">logout</span>
          Logout
        </button>
      </form>
    </div>
  </div>
</header>

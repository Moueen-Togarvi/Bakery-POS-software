<script lang="ts">
  export let pathname = '/';

  const links = [
    { href: '/', label: 'Sales' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/reports', label: 'Reports' },
    { href: '/settings', label: 'Settings' }
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
</script>

<header class="sticky top-0 z-30 border-b border-primary/10 bg-white">
  <div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
    <div class="flex items-center justify-between gap-3">
      <a class="flex items-center gap-3 text-primary" href="/">
        <span class="material-symbols-outlined text-3xl">bakery_dining</span>
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

    <div class="hidden items-center gap-3 md:flex">
      <button class="rounded-lg bg-primary/10 p-2 text-primary" aria-label="Notifications">
        <span class="material-symbols-outlined">notifications</span>
      </button>
    </div>
  </div>
</header>

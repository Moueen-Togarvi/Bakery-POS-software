<script lang="ts">
  import { page } from '$app/stores';

  let { logoUrl = '', storeName = 'OvenFresh POS' } = $props();

  const links = [
    { href: '/', label: 'Sales' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/reports', label: 'Reports' },
    { href: '/management', label: 'Management' },
    { href: '/settings', label: 'Settings' }
  ];

  function isActive(href: string, currentPath: string) {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

<header class="sticky top-0 z-30 border-b border-primary/10 bg-white shadow-sm">
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 md:px-6">
    <a class="flex items-center gap-2.5 text-primary" href="/">
      {#if logoUrl}
        <img src={logoUrl} alt="Logo" class="h-9 w-9 object-contain" />
      {:else}
        <span class="material-symbols-outlined text-3xl">bakery_dining</span>
      {/if}
      <h1 class="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{storeName}</h1>
    </a>

    <nav class="no-scrollbar mx-auto flex w-full max-w-[720px] items-center justify-center gap-2 overflow-x-auto rounded-xl border border-primary/10 bg-primary/5 p-1">
      {#each links as link}
        <a
          href={link.href}
          aria-current={isActive(link.href, $page.url.pathname) ? 'page' : undefined}
          class={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
            isActive(link.href, $page.url.pathname)
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <div class="flex items-center gap-3 justify-self-end">
      <div class="hidden rounded-lg border border-primary/10 bg-slate-50 px-3 py-1.5 lg:flex lg:flex-row lg:items-center lg:gap-3">
        <div class="flex flex-col leading-tight">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Support Number</span>
          <a href="tel:+966557385262" class="text-[13px] font-bold text-slate-800 hover:text-primary">
            +966-557385262
          </a>
        </div>
      </div>
      
      <form method="POST" action="/logout">
        <button class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100" title="Logout">
          <span class="material-symbols-outlined text-xl">logout</span>
        </button>
      </form>
    </div>
  </div>
</header>

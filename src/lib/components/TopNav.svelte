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

  let showSupport = $state(false);
</script>

<header class="sticky top-0 z-30 border-b border-primary/10 bg-white shadow-sm">
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 md:px-6">
    <a class="flex items-center gap-2.5 text-primary" href="/">
      {#if logoUrl}
        <img src={logoUrl} alt="Logo" class="h-10 w-10 object-contain" />
      {:else}
        <span class="material-symbols-outlined text-4xl">bakery_dining</span>
      {/if}
      <h1 class="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{storeName}</h1>
    </a>

    <nav class="no-scrollbar mx-auto flex w-full max-w-[720px] items-center justify-center gap-2 overflow-x-auto rounded-xl border border-primary/10 bg-primary/5 p-1">
      {#each links as link}
        <a
          href={link.href}
          aria-current={isActive(link.href, $page.url.pathname) ? 'page' : undefined}
          class={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
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
      <div class="relative flex items-center">
        <button 
          onclick={() => showSupport = !showSupport}
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all hover:bg-primary/20" 
          title="Support Info"
        >
          <span class="material-symbols-outlined text-xl">info</span>
        </button>
        
        {#if showSupport}
          <div class="absolute right-0 top-full mt-2 w-48 rounded-xl border border-primary/10 bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Support Number</p>
            <a href="tel:+966557385262" class="mt-1 block text-[13px] font-bold text-slate-800 hover:text-primary transition-colors">
              +966-557385262
            </a>
          </div>
        {/if}
      </div>
      
      <form method="POST" action="/logout">
        <button class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100" title="Logout">
          <span class="material-symbols-outlined text-xl">logout</span>
        </button>
      </form>
    </div>
  </div>
</header>

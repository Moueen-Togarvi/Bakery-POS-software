<script lang="ts">
  import '../styles/app.css';
  import { page } from '$app/stores';
  import TopNav from '$lib/components/TopNav.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-screen bg-background-light text-slate-900">
  {#if $page.url.pathname !== '/login'}
    <TopNav
      pathname={$page.url.pathname}
      logoUrl={data.logoUrl ?? undefined}
      storeName={data.storeName ?? 'OvenFresh POS'}
      username={data.username ?? ''}
    />
  {/if}
  {@render children()}
</div>

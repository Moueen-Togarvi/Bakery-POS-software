<script lang="ts">
  import '../styles/app.css';
  import { page } from '$app/stores';
  import TopNav from '$lib/components/TopNav.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';

  let { data, children } = $props();
  let lastFlashKey = $state('');

  $effect(() => {
    const flash = data.flashToast;
    if (!flash) return;

    const key = `${flash.type}:${flash.message}:${flash.subMessage ?? ''}`;
    if (lastFlashKey === key) return;
    lastFlashKey = key;

    if (flash.type === 'success') {
      toastStore.success(flash.message, flash.subMessage);
      return;
    }

    if (flash.type === 'error') {
      toastStore.error(flash.message);
      return;
    }

    toastStore.info(flash.message);
  });
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href="/logo-bakery.svg" />
  <link rel="shortcut icon" href="/logo-bakery.svg" />
</svelte:head>

<div class="min-h-screen bg-background-light text-slate-900">
  <Toast />
  {#if $page.url.pathname !== '/login'}
    <TopNav
      pathname={$page.url.pathname}
      logoUrl={data.logoUrl ?? undefined}
      storeName={data.storeName ?? 'Bakery POS'}
      username={data.username ?? ''}
    />
  {/if}
  {@render children()}
</div>

<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { toastStore } from '$lib/stores/toast.svelte';
  import { fade, fly } from 'svelte/transition';

  let { data, form } = $props();
  const storeName = $derived(data.storeName ?? 'OvenFresh POS');

  let activeTab = $state<'staff' | 'finance'>('staff');
  let busy = $state(false);

  let users = $derived(data.users);
  let finances = $derived(data.finances);

  let showEditModal = $state(false);
  let editUserId = $state(0);
  let editUsername = $state('');
  let editRole = $state<'admin' | 'cashier'>('cashier');
  let editSalary = $state(0);
  let editPassword = $state('');
  let modalBusy = $state(false);
  let modalMessage = $state('');

  function openEdit(user: any) {
    editUserId = user.id;
    editUsername = user.username;
    editRole = user.role;
    editSalary = user.salary;
    editPassword = '';
    modalMessage = '';
    showEditModal = true;
  }

  async function saveUserEdit() {
    modalBusy = true;
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUserId,
          role: editRole,
          salary: Number(editSalary || 0),
          password: editPassword
        })
      });
      const body = await res.json();
      if (!res.ok) {
        modalMessage = body.message ?? 'Update failed.';
        return;
      }
      showEditModal = false;
      await invalidateAll();
    } finally {
      modalBusy = false;
    }
  }

  let userToDelete = $state<any>(null);
  let showDeleteModal = $state(false);

  function openDeleteConfirm(user: any) {
    userToDelete = user;
    showDeleteModal = true;
  }

  async function performRemoveUser() {
    if (!userToDelete) return;
    
    modalBusy = true;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDelete.id, username: userToDelete.username })
      });
      const body = await res.json();
      if (!res.ok) {
        toastStore.error(body.message ?? 'Delete failed');
        return;
      }
      toastStore.success(`User "${userToDelete.username}" deleted.`);
      showDeleteModal = false;
      await invalidateAll();
    } finally {
      modalBusy = false;
    }
  }
</script>

<svelte:head>
  <title>Management | {storeName}</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Admin Management</h1>
      <p class="text-slate-500">Manage staff and business finance</p>
    </div>

    <div class="flex rounded-xl bg-primary/10 p-1">
      <button
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'staff' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        onclick={() => (activeTab = 'staff')}
      >
        Staff & Roles
      </button>
      <button
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        onclick={() => (activeTab = 'finance')}
      >
        Finance & Salary
      </button>
    </div>
  </div>

  {#if form?.message}
    <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
      {form.message}
    </div>
  {/if}

  {#if activeTab === 'staff'}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section class="lg:col-span-2 space-y-6">
        <div class="rounded-2xl bg-white p-5 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900 mb-4">Staff Directory</h2>
          <div class="overflow-x-auto rounded-xl border border-primary/10">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-primary/5 text-slate-700">
                <tr>
                  <th class="px-4 py-3">Username</th>
                  <th class="px-4 py-3">Role</th>
                  <th class="px-4 py-3">Salary</th>
                  <th class="px-4 py-3">Joined At</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each users as user}
                  <tr class="border-t border-primary/5">
                    <td class="px-4 py-3 font-semibold text-slate-900">{user.username}</td>
                    <td class="px-4 py-3">
                      <span class={`rounded-full px-2 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-600">{formatCurrency(user.salary)}</td>
                    <td class="px-4 py-3 text-slate-500">{new Date(user.joinedAt).toLocaleDateString()}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="inline-flex items-center gap-1">
                        <button class="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50" onclick={() => openEdit(user)} disabled={modalBusy}>
                          Edit
                        </button>
                        <button class="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50" onclick={() => openDeleteConfirm(user)} disabled={modalBusy}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div class="rounded-2xl bg-white p-5 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900 mb-2">Add Staff</h2>
          <p class="text-sm text-slate-500 mb-4">Create user credentials</p>
          <form method="POST" action="?/upsertUser" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; update(); }; }} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="username">Username</label>
              <input name="username" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="e.g. cashier1" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="password">Password (Optional)</label>
              <input name="password" type="password" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="••••••••" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="role">Role</label>
              <select name="role" class="w-full rounded-lg border border-primary/20 px-3 py-2">
                <option value="cashier">Cashier</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="salary">Monthly Salary</label>
              <input name="salary" type="number" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="30000" />
            </div>
            <button type="submit" class="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white shadow-md active:scale-95 transition-all inline-flex items-center justify-center gap-2" disabled={busy}>
              {#if busy}
                <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              {:else}
                Save Staff Member
              {/if}
            </button>
          </form>
        </div>
      </section>
    </div>
  {:else if activeTab === 'finance'}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <article class="rounded-xl bg-white p-5 shadow-sm border-l-4 border-emerald-500">
        <p class="text-xs font-semibold text-slate-600">Total Revenue</p>
        <p class="mt-2 text-3xl font-bold text-emerald-600">{formatCurrency(finances.totalRevenue)}</p>
      </article>
      <article class="rounded-xl bg-white p-5 shadow-sm border-l-4 border-red-500">
        <p class="text-xs font-semibold text-slate-600">Total Expenses</p>
        <p class="mt-2 text-3xl font-bold text-red-600">{formatCurrency(finances.totalExpenses)}</p>
      </article>
      <article class="rounded-xl bg-white p-5 shadow-sm border-l-4 border-amber-500">
        <p class="text-xs font-semibold text-slate-600">Staff Salaries</p>
        <p class="mt-2 text-3xl font-bold text-amber-600">{formatCurrency(finances.totalSalaries)}</p>
      </article>
      <article class="rounded-xl bg-white p-5 shadow-sm border-l-4 border-primary">
        <p class="text-xs font-semibold text-slate-600">Net Profit</p>
        <p class="mt-2 text-3xl font-bold text-primary">{formatCurrency(finances.netProfit)}</p>
      </article>

      <section class="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Log Transaction</h2>
        <form method="POST" action="?/addExpense" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; update(); }; }} class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="category">Category</label>
              <select name="category" class="w-full rounded-lg border border-primary/20 px-3 py-2">
                <option value="expense">General Expense</option>
                <option value="salary">Salary Payout</option>
                <option value="income">Extra Income</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="amount">Amount</label>
              <input name="amount" type="number" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="Price" required />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1" for="note">Note / Description</label>
            <input name="note" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="e.g. Utility bills" />
          </div>
          <button type="submit" class="w-full rounded-lg bg-primary py-3.5 font-bold text-white shadow-md inline-flex items-center justify-center gap-2 active:scale-95 translation-all" disabled={busy}>
            {#if busy}
              <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Recording...
            {:else}
              Record Transaction
            {/if}
          </button>
        </form>
      </section>

      <div class="lg:col-span-2 bg-primary/5 rounded-2xl p-5 border border-primary/10">
        <h3 class="font-bold text-slate-800 mb-2">Finance Guide</h3>
        <p class="text-sm text-slate-600 leading-relaxed">
          Log all business expenses and salary payouts here to keep an accurate track of your <b>Net Profit</b>.
          Revenue is automatically calculated from completed sales.
        </p>
      </div>
    </div>
  {/if}
</main>

{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)]" in:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="bg-slate-50 border-b border-primary/5 p-6">
        <h3 class="text-xl font-bold text-slate-900">Edit Staff Member</h3>
        <p class="mt-1 text-sm text-slate-500">Updating profile for <span class="font-bold text-primary">{editUsername}</span></p>
      </div>

      <div class="p-6 space-y-5">
        {#if modalMessage}
          <div class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{modalMessage}</div>
        {/if}

        <div class="space-y-4">
          <div>
            <label for="edit-user-role" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Role</label>
            <select id="edit-user-role" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5" bind:value={editRole}>
              <option value="cashier">Cashier</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label for="edit-user-salary" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Salary</label>
            <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
                <input id="edit-user-salary" class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-3 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5" type="number" bind:value={editSalary} />
            </div>
          </div>
          <div>
            <label for="edit-user-password" class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">New Password <span class="text-[10px] font-normal italic text-slate-400">(Leave blank to keep current)</span></label>
            <input id="edit-user-password" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5" type="password" placeholder="••••••••" bind:value={editPassword} />
          </div>
        </div>
      </div>

      <div class="bg-slate-50 p-6 flex justify-end gap-3">
        <button class="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95" onclick={() => (showEditModal = false)} disabled={modalBusy}>
          Cancel
        </button>
        <button class="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2" onclick={saveUserEdit} disabled={modalBusy}>
          {#if modalBusy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" in:fade={{ duration: 200 }}>
    <div class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" in:fly={{ y: 20, duration: 400 }}>
      <div class="p-8 text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <span class="material-symbols-outlined text-4xl">person_remove</span>
        </div>
        <h3 class="text-xl font-bold text-slate-900">Remove Staff?</h3>
        <p class="mt-3 text-sm text-slate-500 leading-relaxed italic">Are you sure you want to remove <span class="font-bold text-slate-800">"{userToDelete?.username}"</span>? This will revoke their access immediately.</p>
      </div>
      <div class="bg-slate-50 p-6 flex gap-3">
        <button class="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick={() => (showDeleteModal = false)}>Cancel</button>
        <button class="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all inline-flex items-center justify-center gap-2" onclick={performRemoveUser} disabled={modalBusy}>
          {#if modalBusy}
            <div class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Removing...
          {:else}
            Remove
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}


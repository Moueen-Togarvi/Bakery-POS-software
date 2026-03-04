<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  export let form: ActionData;
  const storeName = data.storeName ?? 'OvenFresh POS';

  let activeTab: 'staff' | 'finance' = 'staff';
  let busy = false;

  $: users = data.users;
  $: finances = data.finances;

  let showEditModal = false;
  let editUserId = 0;
  let editUsername = '';
  let editRole: 'admin' | 'cashier' = 'cashier';
  let editSalary = 0;
  let editPassword = '';
  let modalBusy = false;
  let modalMessage = '';

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

  async function removeUser(user: any) {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, username: user.username })
    });
    const body = await res.json();
    if (!res.ok) {
      alert(body.message ?? 'Delete failed');
      return;
    }
    await invalidateAll();
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
        on:click={() => (activeTab = 'staff')}
      >
        Staff & Roles
      </button>
      <button
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        on:click={() => (activeTab = 'finance')}
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
                        <button class="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100" on:click={() => openEdit(user)}>
                          Edit
                        </button>
                        <button class="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100" on:click={() => removeUser(user)}>
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
            <button type="submit" class="w-full rounded-lg bg-primary py-2 font-bold text-white shadow-md active:scale-95 transition-all" disabled={busy}>
              {busy ? 'Saving...' : 'Save Staff Member'}
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
        <form method="POST" action="?/addExpense" use:enhance class="space-y-4">
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
          <button type="submit" class="w-full rounded-lg bg-primary py-2 font-bold text-white shadow-md">
            Record Transaction
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <h3 class="text-lg font-bold text-slate-900">Edit Staff</h3>
      <p class="mb-4 text-xs text-slate-500">{editUsername}</p>

      {#if modalMessage}
        <div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{modalMessage}</div>
      {/if}

      <div class="space-y-3">
        <div>
          <label for="edit-user-role" class="mb-1 block text-xs font-semibold text-slate-600">Role</label>
          <select id="edit-user-role" class="w-full rounded-lg border border-primary/20 px-3 py-2" bind:value={editRole}>
            <option value="cashier">Cashier</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div>
          <label for="edit-user-salary" class="mb-1 block text-xs font-semibold text-slate-600">Salary</label>
          <input id="edit-user-salary" class="w-full rounded-lg border border-primary/20 px-3 py-2" type="number" bind:value={editSalary} />
        </div>
        <div>
          <label for="edit-user-password" class="mb-1 block text-xs font-semibold text-slate-600">New Password (optional)</label>
          <input id="edit-user-password" class="w-full rounded-lg border border-primary/20 px-3 py-2" type="password" bind:value={editPassword} />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" on:click={() => (showEditModal = false)} disabled={modalBusy}>
          Cancel
        </button>
        <button class="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white" on:click={saveUserEdit} disabled={modalBusy}>
          {modalBusy ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

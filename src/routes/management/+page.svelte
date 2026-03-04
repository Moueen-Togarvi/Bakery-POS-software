<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { formatCurrency } from '$lib/components/Currency';
  import { enhance } from '$app/forms';

  export let data: PageData;
  export let form: ActionData;

  let activeTab: 'staff' | 'finance' | 'settings' = 'staff';
  let busy = false;

  $: users = data.users;
  $: finances = data.finances;
  $: logoUrl = data.logoUrl;
</script>

<svelte:head>
  <title>Management | OvenFresh POS</title>
</svelte:head>

<main class="min-h-[calc(100vh-69px)] p-4 md:p-6">
  <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Admin Management</h1>
      <p class="text-slate-500">Manage your staff, finances, and store settings</p>
    </div>
    
    <div class="flex rounded-xl bg-primary/10 p-1">
      <button 
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'staff' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        on:click={() => activeTab = 'staff'}
      >
        Staff & Roles
      </button>
      <button 
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        on:click={() => activeTab = 'finance'}
      >
        Finance & Salary
      </button>
      <button 
        class={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'settings' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary'}`}
        on:click={() => activeTab = 'settings'}
      >
        Branding
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
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div class="rounded-2xl bg-white p-5 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900 mb-2">Add / Update Staff</h2>
          <p class="text-sm text-slate-500 mb-4">Create or modify user credentials</p>
          <form method="POST" action="?/upsertUser" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; update(); }; }} class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="username">Username</label>
              <input name="username" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="e.g. cashier1" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1" for="password">Password (Optional to Update)</label>
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
              <input name="salary" type="number" class="w-full rounded-lg border border-primary/20 px-3 py-2" placeholder="Rs 30000" />
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
  {:else if activeTab === 'settings'}
    <div class="max-w-xl mx-auto rounded-2xl bg-white p-6 shadow-sm border border-primary/10">
      <h2 class="text-2xl font-bold text-slate-900 mb-1">Store Branding</h2>
      <p class="text-slate-500 mb-6">Update your bakery's logo and public profile</p>

      <form method="POST" action="?/updateLogo" use:enhance class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2" for="logoUrl">Logo URL</label>
          <div class="flex gap-3">
            <input 
              name="logoUrl" 
              class="flex-1 rounded-lg border border-primary/20 px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none" 
              placeholder="https://example.com/logo.png" 
              value={logoUrl ?? ''}
            />
            <button class="bg-primary text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-primary/20">
              Save
            </button>
          </div>
          <p class="mt-2 text-xs text-slate-400">Provide a hosted image URL for your bakery logo.</p>
        </div>

        <div class="pt-6 border-t border-slate-100">
          <p class="text-sm font-bold text-slate-700 mb-3">Logo Preview</p>
          <div class="h-32 w-full rounded-xl bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 overflow-hidden">
            {#if logoUrl}
              <img src={logoUrl} alt="Logo Preview" class="max-h-full max-w-full object-contain p-2" />
            {:else}
              <span class="material-symbols-outlined text-slate-300 text-5xl">image</span>
            {/if}
          </div>
        </div>
      </form>
    </div>
  {/if}
</main>

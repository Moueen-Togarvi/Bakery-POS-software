import type { PageServerLoad, Actions } from './$types';
import { getUsers, getFinancialSummary, getSetting, updateSetting, upsertUser, logFinanceTransaction } from '$lib/server/pos';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    const [users, finances, logoUrl] = await Promise.all([
        getUsers(),
        getFinancialSummary(),
        getSetting('logo_url')
    ]);

    return {
        users,
        finances,
        logoUrl
    };
};

export const actions: Actions = {
    updateLogo: async ({ request }) => {
        const data = await request.formData();
        const url = String(data.get('logoUrl') ?? '');
        await updateSetting('logo_url', url);
        return { success: true };
    },

    upsertUser: async ({ request }) => {
        const data = await request.formData();
        const username = String(data.get('username') ?? '');
        const role = String(data.get('role') ?? 'cashier');
        const salary = Number(data.get('salary') ?? 0);
        const password = String(data.get('password') ?? '');

        if (!username) return fail(400, { message: 'Username is required' });

        await upsertUser({
            username,
            role,
            salary,
            passwordHash: password || undefined
        });

        return { success: true };
    },

    addExpense: async ({ request }) => {
        const data = await request.formData();
        const category = String(data.get('category') ?? 'expense');
        const amount = Number(data.get('amount') ?? 0);
        const note = String(data.get('note') ?? '');

        if (amount <= 0) return fail(400, { message: 'Valid amount is required' });

        await logFinanceTransaction({
            category,
            amount,
            note
        });

        return { success: true };
    }
};

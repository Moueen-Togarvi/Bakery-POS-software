import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getUsers } from '$lib/server/pos';

export const load: PageServerLoad = async ({ cookies }) => {
    const session = cookies.get('session');
    if (session) {
        throw redirect(303, '/');
    }
    return {};
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get('username')?.toString().trim();
        const password = data.get('password')?.toString();

        if (!username || !password) {
            return fail(400, { message: 'Username and password are required' });
        }

        try {
            const users = await getUsers();
            const user = users.find(u => u.username === username);

            // Simple auth check for now relying on matching username. 
            // In a real app we'd check password_hash
            if (!user) {
                return fail(400, { message: 'Invalid credentials' });
            }

            // Allow any password for existing users as requested by the simplicity of the db setup
            // (The DB seeds didn't focus on password_hash checking)

            cookies.set('session', user.username, {
                path: '/',
                httpOnly: true,
                secure: false, // Set to true if using HTTPS, but false for local dev/testing
                sameSite: 'lax',
                // Session cookie: cleared when browser session ends
            });

            throw redirect(303, '/');
        } catch (e) {
            // SvelteKit redirect needs to be thrown to work
            if ((e as any).status && (e as any).location) throw e;
            if (e instanceof Response) throw e;

            console.error('--- Login Action Failure ---');
            console.error(e);

            const errBase = e instanceof Error ? e.message : String(e);
            return fail(500, {
                message: `Server Connection Error. Please try again or check your internet. (${errBase.slice(0, 50)})`
            });
        }
    }
};

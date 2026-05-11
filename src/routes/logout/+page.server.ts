import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { setFlashToast } from '$lib/server/flash-toast';

export const actions: Actions = {
    default: async ({ cookies }) => {
        cookies.delete('session', { path: '/' });
        setFlashToast(cookies, {
            type: 'success',
            message: 'Logged out successfully.',
            subMessage: 'See you again soon.'
        });
        throw redirect(303, '/login');
    }
};

import type { LayoutServerLoad } from './$types';
import { getSetting } from '$lib/server/pos';
import { consumeFlashToast } from '$lib/server/flash-toast';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
    let logoUrl: string | null = null;
    let storeName: string | null = 'Bakery POS';
    const flashToast = consumeFlashToast(cookies);

    try {
        const [logo, name] = await Promise.all([
            getSetting('logo_url'),
            getSetting('store_name')
        ]);
        logoUrl = logo;
        storeName = name || 'Bakery POS';
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Layout] Branding settings unavailable, continuing with defaults: ${message}`);
    }

    return {
        logoUrl,
        storeName,
        username: locals.user || '',
        flashToast
    };
};

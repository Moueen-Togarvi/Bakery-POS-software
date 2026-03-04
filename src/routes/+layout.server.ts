import type { LayoutServerLoad } from './$types';
import { getSetting } from '$lib/server/pos';

export const load: LayoutServerLoad = async ({ locals }) => {
    let logoUrl: string | null = null;
    let storeName: string | null = 'OvenFresh POS';

    try {
        const [logo, name] = await Promise.all([
            getSetting('logo_url'),
            getSetting('store_name')
        ]);
        logoUrl = logo;
        storeName = name || 'OvenFresh POS';
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Layout] Branding settings unavailable, continuing with defaults: ${message}`);
    }

    return {
        logoUrl,
        storeName,
        username: locals.user || ''
    };
};

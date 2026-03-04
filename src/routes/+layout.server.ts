import type { LayoutServerLoad } from './$types';
import { getSetting } from '$lib/server/pos';

export const load: LayoutServerLoad = async () => {
    const logoUrl = await getSetting('logo_url');
    return {
        logoUrl
    };
};

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getSetting, updateSetting } from '$lib/server/pos';

export const load: PageServerLoad = async () => {
  const [storeName, logoUrl] = await Promise.all([
    getSetting('store_name'),
    getSetting('logo_url')
  ]);

  return {
    storeName: storeName || 'Satluj Solar',
    logoUrl: logoUrl || ''
  };
};

export const actions: Actions = {
  updateBranding: async ({ request }) => {
    const data = await request.formData();
    const storeName = String(data.get('storeName') ?? '').trim();
    const logoUrl = String(data.get('logoUrl') ?? '').trim();

    if (!storeName) {
      return fail(400, { message: 'Store name is required.' });
    }

    await Promise.all([
      updateSetting('store_name', storeName),
      updateSetting('logo_url', logoUrl)
    ]);

    return { success: true, message: 'Store branding updated.' };
  }
};

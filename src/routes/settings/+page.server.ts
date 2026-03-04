import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getSetting, updateSetting } from '$lib/server/pos';

export const load: PageServerLoad = async () => {
  const [storeName, logoUrl, taxRate] = await Promise.all([
    getSetting('store_name'),
    getSetting('logo_url'),
    getSetting('tax_rate')
  ]);

  return {
    storeName: storeName || 'OvenFresh POS',
    logoUrl: logoUrl || '',
    taxRate: taxRate || '8'
  };
};

export const actions: Actions = {
  updateBranding: async ({ request }) => {
    const data = await request.formData();
    const storeName = String(data.get('storeName') ?? '').trim();
    const logoUrl = String(data.get('logoUrl') ?? '').trim();
    const taxRate = String(data.get('taxRate') ?? '8').trim();

    if (!storeName) {
      return fail(400, { message: 'Store name is required.' });
    }

    await Promise.all([
      updateSetting('store_name', storeName),
      updateSetting('logo_url', logoUrl),
      updateSetting('tax_rate', taxRate || '8')
    ]);

    return { success: true, message: 'Store branding updated.' };
  }
};

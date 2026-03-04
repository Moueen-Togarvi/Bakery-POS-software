import type { PageServerLoad } from './$types';
import { getCategories, getInventoryRows } from '$lib/server/pos';



export const load: PageServerLoad = async () => {
  try {
    const [rows, categories] = await Promise.all([getInventoryRows(), getCategories()]);

    return {
      rows,
      categories,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Inventory loading error:', error instanceof Error ? error.message : String(error));
    return {
      rows: [],
      categories: [],
      dbOffline: true,
      dbMessage: 'Error loading inventory data.'
    };
  }
};

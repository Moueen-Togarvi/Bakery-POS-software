import { json } from '@sveltejs/kit';
import { getCategories, getInventoryRows } from '$lib/server/pos';

import type { RequestHandler } from './$types';

export async function GET() {
  try {
    const [rows, categories] = await Promise.all([getInventoryRows(), getCategories()]);
    return json({ rows, categories, dbOffline: false });
  } catch (error) {
    console.error('Inventory API error:', error);
    return json({ message: 'Error loading inventory' }, { status: 500 });
  }
}

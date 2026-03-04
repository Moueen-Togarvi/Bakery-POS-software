import { json } from '@sveltejs/kit';
import { getProducts } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const categoryId = url.searchParams.get('categoryId');
  const parsed = categoryId ? Number(categoryId) : undefined;
  const category = Number.isFinite(parsed) ? parsed : undefined;

  try {
    const products = await getProducts(category);
    return json(products);
  } catch (error) {
    console.error('Products API error:', error);
    return json({ message: 'Error fetching products' }, { status: 500 });
  }
};

import { json } from '@sveltejs/kit';
import { getProducts } from '$lib/server/pos';
import { filterMockProducts } from '$lib/server/mock';

export async function GET({ url }) {
  const categoryId = url.searchParams.get('categoryId');
  const parsed = categoryId ? Number(categoryId) : undefined;
  const category = Number.isFinite(parsed) ? parsed : undefined;

  try {
    const products = await getProducts(category);
    return json(products);
  } catch (error) {
    console.error('Products API fallback to mock data:', error);
    return json(filterMockProducts(category));
  }
}

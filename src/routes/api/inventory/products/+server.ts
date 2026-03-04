import { json } from '@sveltejs/kit';
import { createProduct } from '$lib/server/pos';
import { createMockProduct } from '$lib/server/mock';

export async function POST({ request }) {
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const imageUrl = String(body.imageUrl ?? '').trim();

  if (!name) {
    return json({ message: 'Product name is required.' }, { status: 400 });
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return json({ message: 'Valid category is required.' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return json({ message: 'Valid price is required.' }, { status: 400 });
  }

  try {
    const product = await createProduct({
      name,
      categoryId,
      price,
      imageUrl
    });
    return json({ product, dbOffline: false });
  } catch (error) {
    console.error('Create product fallback:', error);
    try {
      const product = createMockProduct({
        name,
        categoryId,
        price,
        imageUrl
      });
      return json({ product, dbOffline: true });
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : 'Could not create product.';
      return json({ message }, { status: 400 });
    }
  }
}

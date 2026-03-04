import { json } from '@sveltejs/kit';
import { createProduct } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, categoryId, price, imageUrl, stock, sku, unitType, flavor } = data;

    if (!name || !name.trim()) {
      return json({ message: 'Product name is required.' }, { status: 400 });
    }
    if (!categoryId) {
      return json({ message: 'Valid category is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return json({ message: 'Valid price is required.' }, { status: 400 });
    }

    const product = await createProduct({
      name: name.trim(),
      categoryId: Number(categoryId),
      price: Number(price),
      imageUrl: imageUrl || undefined,
      stock: Number(stock ?? 0),
      sku: sku || undefined,
      unitType: unitType as any,
      flavor: flavor || undefined
    });

    return json({ product, dbOffline: false });
  } catch (error) {
    console.error('Create product error:', error);
    return json({ message: 'Error creating product' }, { status: 500 });
  }
};

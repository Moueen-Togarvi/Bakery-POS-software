import { json } from '@sveltejs/kit';
import { createProduct } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const imageUrl = String(body.imageUrl ?? '').trim();
  const stock = Number(body.stock ?? 0);
  const sku = body.sku ? String(body.sku).trim() : null;
  const unitType = String(body.unitType ?? 'pcs');

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
      imageUrl,
      stock,
      sku: sku || undefined,
      unitType: unitType as any
    });
    return json({ product, dbOffline: false });
  } catch (error) {
    console.error('Create product error:', error);
    return json({ message: 'Error creating product' }, { status: 500 });
  }
};

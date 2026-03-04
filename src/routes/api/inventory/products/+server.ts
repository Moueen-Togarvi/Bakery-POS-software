import { json } from '@sveltejs/kit';
import { createProduct, deleteProduct, updateProduct } from '$lib/server/pos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, categoryId, price, buyingPrice, imageUrl, stock, sku, unitType, flavor } = data;

    if (!name || !name.trim()) {
      return json({ message: 'Product name is required.' }, { status: 400 });
    }
    if (!categoryId) {
      return json({ message: 'Valid category is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return json({ message: 'Valid price is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(buyingPrice ?? 0)) || Number(buyingPrice ?? 0) < 0) {
      return json({ message: 'Valid buying price is required.' }, { status: 400 });
    }

    const product = await createProduct({
      name: name.trim(),
      categoryId: Number(categoryId),
      price: Number(price),
      buyingPrice: Number(buyingPrice ?? 0),
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

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { id, name, categoryId, price, buyingPrice, imageUrl, stock, sku, unitType, flavor } = data;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return json({ message: 'Valid product id is required.' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return json({ message: 'Product name is required.' }, { status: 400 });
    }
    if (!categoryId) {
      return json({ message: 'Valid category is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return json({ message: 'Valid price is required.' }, { status: 400 });
    }
    if (!Number.isFinite(Number(buyingPrice ?? 0)) || Number(buyingPrice ?? 0) < 0) {
      return json({ message: 'Valid buying price is required.' }, { status: 400 });
    }

    const product = await updateProduct({
      id: Number(id),
      name: name.trim(),
      categoryId: Number(categoryId),
      price: Number(price),
      buyingPrice: Number(buyingPrice ?? 0),
      imageUrl: imageUrl || undefined,
      stock: Number(stock ?? 0),
      sku: sku || undefined,
      unitType: unitType as any,
      flavor: flavor || undefined
    });

    return json({ product, dbOffline: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating product';
    return json({ message }, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const productId = Number(data?.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return json({ message: 'Valid product id is required.' }, { status: 400 });
    }

    await deleteProduct(productId);
    return json({ success: true, dbOffline: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error deleting product';
    return json({ message }, { status: 400 });
  }
};

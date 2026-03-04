import { json } from '@sveltejs/kit';
import { getCategories, getProducts } from '$lib/server/pos';
import { mockCategories, mockProducts } from '$lib/server/mock';

const transformRows = (products: Awaited<ReturnType<typeof getProducts>>) =>
  products.map((product, index) => {
    const stock = 8 + ((product.id + index) % 25);
    const reorderLevel = 10;
    return {
      id: product.id,
      name: product.name,
      category: product.categoryName,
      unitPrice: Number(product.price),
      stock,
      reorderLevel,
      status: stock <= reorderLevel ? 'Low' : 'Healthy'
    };
  });

export async function GET() {
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    return json({ rows: transformRows(products), categories, dbOffline: false });
  } catch (error) {
    console.error('Inventory API fallback:', error);
    return json({ rows: transformRows(mockProducts), categories: mockCategories, dbOffline: true });
  }
}

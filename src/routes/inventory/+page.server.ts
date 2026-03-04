import type { PageServerLoad } from './$types';
import { getCategories, getProducts } from '$lib/server/pos';
import { mockCategories, mockProducts } from '$lib/server/mock';

function buildInventoryRows(products: Awaited<ReturnType<typeof getProducts>>) {
  return products.map((product, index) => {
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
}

export const load: PageServerLoad = async () => {
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    const rows = buildInventoryRows(products);
    return {
      rows,
      categories,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Inventory fallback to sample data:', error);
    const rows = buildInventoryRows(mockProducts);
    return {
      rows,
      categories: mockCategories,
      dbOffline: true,
      dbMessage: 'Neon database se inventory data nahi aa raha. Sample data show ho raha hai.'
    };
  }
};

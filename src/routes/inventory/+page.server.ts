import type { PageServerLoad } from './$types';
import { getCategories, getProducts } from '$lib/server/pos';
import { mockCategories, mockProducts } from '$lib/server/mock';

function buildInventoryRows(products: Awaited<ReturnType<typeof getProducts>>) {
  try {
    return products.map((product, index) => {
      const stock = 8 + ((product.id + index) % 25);
      const reorderLevel = 10;
      const unitPrice = Number(product.price);
      
      if (!Number.isFinite(unitPrice)) {
        console.warn(`Invalid price for product ${product.id}:`, product.price);
        throw new Error(`Invalid price: ${product.price}`);
      }
      
      return {
        id: product.id,
        name: product.name,
        category: product.categoryName || '',
        unitPrice: unitPrice,
        stock,
        reorderLevel,
        status: stock <= reorderLevel ? 'Low' : 'Healthy'
      };
    });
  } catch (error) {
    console.error('Error building inventory rows:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export const load: PageServerLoad = async () => {
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    
    if (!products || !Array.isArray(products)) {
      throw new Error('Invalid products response');
    }
    if (!categories || !Array.isArray(categories)) {
      throw new Error('Invalid categories response');
    }
    
    const rows = buildInventoryRows(products);
    
    return {
      rows,
      categories,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Inventory fallback to sample data:', error instanceof Error ? error.message : String(error));
    try {
      const rows = buildInventoryRows(mockProducts);
      return {
        rows,
        categories: mockCategories,
        dbOffline: true,
        dbMessage: 'Using sample data.'
      };
    } catch (fallbackError) {
      console.error('Fallback inventory error:', fallbackError);
      return {
        rows: [],
        categories: mockCategories,
        dbOffline: true,
        dbMessage: 'Error loading inventory data.'
      };
    }
  }
};

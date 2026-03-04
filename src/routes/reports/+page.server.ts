import type { PageServerLoad } from './$types';
import { getCartSummary, getProducts } from '$lib/server/pos';
import { mockCart, mockProducts } from '$lib/server/mock';

function buildReport(products: Awaited<ReturnType<typeof getProducts>>, cart: Awaited<ReturnType<typeof getCartSummary>>) {
  try {
    if (!products || !Array.isArray(products)) {
      throw new Error('Invalid products');
    }
    if (!cart || typeof cart !== 'object') {
      throw new Error('Invalid cart');
    }
    
    const totalProducts = products.length;
    const orderValue = Number(cart.total) || 0;
    const topItems = [...(cart.items || [])].sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 5);
    const totalUnitsInCart = (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      totalProducts,
      orderValue,
      topItems,
      totalUnitsInCart
    };
  } catch (error) {
    console.error('Error building report:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export const load: PageServerLoad = async () => {
  try {
    const [products, cart] = await Promise.all([getProducts(), getCartSummary()]);
    return {
      ...buildReport(products, cart),
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Reports fallback to sample data:', error instanceof Error ? error.message : String(error));
    try {
      return {
        ...buildReport(mockProducts, mockCart),
        dbOffline: true,
        dbMessage: 'Using sample data.'
      };
    } catch (fallbackError) {
      console.error('Fallback report error:', fallbackError);
      return {
        totalProducts: 0,
        orderValue: 0,
        topItems: [],
        totalUnitsInCart: 0,
        dbOffline: true,
        dbMessage: 'Error loading report data.'
      };
    }
  }
};

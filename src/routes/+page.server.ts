import type { PageServerLoad } from './$types';
import { getCartSummary, getCategories, getProducts } from '$lib/server/pos';

export const load: PageServerLoad = async () => {
  try {
    const [categories, products, cart] = await Promise.all([
      getCategories(),
      getProducts(),
      getCartSummary()
    ]);

    return {
      categories,
      products,
      cart,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Data loading error:', error instanceof Error ? error.message : String(error));

    // Return minimal data structure as last resort
    return {
      categories: [],
      products: [],
      cart: {
        orderId: 0,
        orderNo: '',
        customerName: '',
        paymentMethod: 'Cash',
        receiptNo: '',
        receiptIssuedAt: new Date().toISOString(),
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0
      },
      dbOffline: true,
      dbMessage: 'System temporarily unavailable. Please refresh the page.'
    };
  }
};

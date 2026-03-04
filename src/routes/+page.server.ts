import type { PageServerLoad } from './$types';
import { getCartSummary, getCategories, getProducts } from '$lib/server/pos';
import { mockCart, mockCategories, mockProducts } from '$lib/server/mock';

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
    console.error('Data loading error, falling back to mock data:', error instanceof Error ? error.message : String(error));
    
    try {
      // Ensure mock data is properly structured
      const fallbackData = {
        categories: mockCategories,
        products: mockProducts,
        cart: mockCart,
        dbOffline: true,
        dbMessage: 'Database unavailable. Using sample data.'
      };
      
      // Validate data before returning
      if (!fallbackData.categories || !Array.isArray(fallbackData.categories)) {
        throw new Error('Invalid categories data');
      }
      if (!fallbackData.products || !Array.isArray(fallbackData.products)) {
        throw new Error('Invalid products data');
      }
      if (!fallbackData.cart) {
        throw new Error('Invalid cart data');
      }
      
      return fallbackData;
    } catch (fallbackError) {
      console.error('Fallback data error:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      
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
  }
};

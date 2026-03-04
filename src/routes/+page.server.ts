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
    console.error('Neon DB unavailable, serving mock data for UI:', error);
    return {
      categories: mockCategories,
      products: mockProducts,
      cart: mockCart,
      dbOffline: true,
      dbMessage: 'Neon database reachable nahi hai (timeout). Sample backend mode active hai aur Current Order ka add/remove kaam karega.'
    };
  }
};

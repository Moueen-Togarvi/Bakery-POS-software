import type { PageServerLoad } from './$types';
import { getCartSummary, getProducts } from '$lib/server/pos';
import { mockCart, mockProducts } from '$lib/server/mock';

function buildReport(products: Awaited<ReturnType<typeof getProducts>>, cart: Awaited<ReturnType<typeof getCartSummary>>) {
  const totalProducts = products.length;
  const orderValue = cart.total;
  const topItems = [...cart.items].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return {
    totalProducts,
    orderValue,
    topItems,
    totalUnitsInCart: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  };
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
    console.error('Reports fallback to sample data:', error);
    return {
      ...buildReport(mockProducts, mockCart),
      dbOffline: true,
      dbMessage: 'Neon reports data fetch fail hua. Sample snapshot show ho raha hai.'
    };
  }
};

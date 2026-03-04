import type { PageServerLoad } from './$types';
import { getCartSummary, getCategories, getProducts, getRecentOrders, getSalesReport } from '$lib/server/pos';

export const load: PageServerLoad = async () => {
  try {
    const [categories, products, cart, recentOrders, todayReport] = await Promise.all([
      getCategories(),
      getProducts(),
      getCartSummary(),
      getRecentOrders(5),
      getSalesReport({ period: 'daily' })
    ]);

    return {
      categories,
      products,
      cart,
      recentOrders,
      todaySales: todayReport.totalRevenue,
      todayOrders: todayReport.totalOrders,
      todayProfit: todayReport.grossProfit,
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
      recentOrders: [],
      todaySales: 0,
      todayOrders: 0,
      todayProfit: 0,
      dbOffline: true,
      dbMessage: 'System temporarily unavailable. Please refresh the page.'
    };
  }
};

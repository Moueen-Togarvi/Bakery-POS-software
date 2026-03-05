import type { PageServerLoad } from './$types';
import { getCartSummary, getCategories, getProducts, getRecentOrders, getSalesReport, getSetting } from '$lib/server/pos';

export const load: PageServerLoad = async () => {
  try {
    const [categories, products, cart, todayReport, taxRateSetting] = await Promise.all([
      getCategories(),
      getProducts(),
      getCartSummary(),
      getSalesReport({ period: 'daily' }),
      getSetting('tax_rate')
    ]);

    return {
      categories,
      products,
      cart,
      todaySales: todayReport.totalRevenue,
      todayNetSales: todayReport.netSales,
      todayOrders: todayReport.totalOrders,
      todayReturns: todayReport.totalReturns,
      todayProfit: todayReport.grossProfit,
      taxRate: (() => { const v = Number(taxRateSetting); return Number.isFinite(v) && v >= 1 ? v / 100 : (v || 0.20); })(),
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
      taxRate: 0.20,
      dbOffline: true,
      dbMessage: 'System temporarily unavailable. Please refresh the page.'
    };
  }
};

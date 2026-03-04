import type { PageServerLoad } from './$types';
import { getSalesReport, getProducts } from '$lib/server/pos';

export const load: PageServerLoad = async ({ url }) => {
  try {
    const search = url.searchParams.get('search') || '';
    const [report, products] = await Promise.all([getSalesReport(search), getProducts()]);

    return {
      totalProducts: products.length,
      totalOrders: report.totalOrders,
      totalRevenue: report.totalRevenue,
      avgOrderValue: report.avgOrderValue,
      topItems: report.topItems,
      recentOrders: report.recentOrders,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Reports loading error:', error instanceof Error ? error.message : String(error));
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      topItems: [],
      recentOrders: [],
      dbOffline: true,
      dbMessage: 'Error loading report data.'
    };
  }
};

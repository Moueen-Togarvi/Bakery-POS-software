import type { PageServerLoad } from './$types';
import { getSalesReport, getProducts } from '$lib/server/pos';

export const load: PageServerLoad = async ({ url }) => {
  try {
    const search = url.searchParams.get('search') || '';
    const periodParam = (url.searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly' | 'custom';
    const period = ['daily', 'weekly', 'monthly', 'custom'].includes(periodParam) ? periodParam : 'daily';
    const baseDate = url.searchParams.get('baseDate') || '';
    const dateFrom = url.searchParams.get('from') || '';
    const dateTo = url.searchParams.get('to') || '';

    const [report, products] = await Promise.all([
      getSalesReport({ search, period, baseDate, dateFrom, dateTo }),
      getProducts()
    ]);

    return {
      period,
      baseDate,
      dateFrom,
      dateTo,
      totalProducts: products.length,
      totalOrders: report.totalOrders,
      totalRevenue: report.totalRevenue,
      totalCost: report.totalCost,
      grossProfit: report.grossProfit,
      profitMargin: report.profitMargin,
      avgOrderValue: report.avgOrderValue,
      topItems: report.topItems,
      recentOrders: report.recentOrders,
      dbOffline: false,
      dbMessage: ''
    };
  } catch (error) {
    console.error('Reports loading error:', error instanceof Error ? error.message : String(error));
    return {
      period: 'daily',
      baseDate: '',
      dateFrom: '',
      dateTo: '',
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      avgOrderValue: 0,
      topItems: [],
      recentOrders: [],
      dbOffline: true,
      dbMessage: 'Error loading report data.'
    };
  }
};

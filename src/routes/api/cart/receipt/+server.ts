import { json } from '@sveltejs/kit';
import { getCartSummary } from '$lib/server/pos';

export async function GET() {
  try {
    const cart = await getCartSummary();
    return json({
      receiptNo: cart.receiptNo,
      orderNo: cart.orderNo,
      customerName: cart.customerName,
      paymentMethod: cart.paymentMethod,
      issuedAt: cart.receiptIssuedAt,
      items: cart.items,
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total
    });
  } catch (error) {
    console.error('Receipt error:', error);
    return json({ message: 'Error fetching receipt' }, { status: 500 });
  }
}

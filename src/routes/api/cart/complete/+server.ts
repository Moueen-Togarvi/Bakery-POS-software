import { json } from '@sveltejs/kit';
import { completeOpenOrder, getCartSummary } from '$lib/server/pos';
import type { RequestHandler } from './$types';
import type { PaymentMethod } from '$lib/server/types';

const validPaymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];

export const POST: RequestHandler = async ({ request }) => {
  let paymentMethod: PaymentMethod = 'Cash';
  try {
    const body = await request.json().catch(() => ({}));
    if (body.paymentMethod && validPaymentMethods.includes(body.paymentMethod)) {
      paymentMethod = body.paymentMethod;
    }
  } catch {
    // use default
  }

  try {
    const receipt = await completeOpenOrder(paymentMethod);
    const cart = await getCartSummary();
    return json({ receipt, cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sale could not be completed.';
    return json({ message }, { status: 400 });
  }
};

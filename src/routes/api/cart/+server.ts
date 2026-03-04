import { json } from '@sveltejs/kit';
import { clearOpenOrder, getCartSummary, setOrderPaymentMethod, upsertCartItem } from '$lib/server/pos';
import type { RequestHandler } from './$types';
import type { PaymentMethod } from '$lib/server/types';

const validPaymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];

export const GET: RequestHandler = async () => {
  try {
    return json(await getCartSummary());
  } catch (error) {
    console.error('Cart API error:', error);
    return json({ message: 'Error fetching cart' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const productId = Number(body.productId);
  const delta = Number(body.delta);

  if (!Number.isInteger(productId) || !Number.isInteger(delta) || delta === 0) {
    return json({ message: 'Invalid payload' }, { status: 400 });
  }

  try {
    await upsertCartItem(productId, delta);
    return json(await getCartSummary());
  } catch (error) {
    console.error('Cart update error:', error);
    return json({ message: 'Error updating cart' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async () => {
  try {
    await clearOpenOrder();
    return json(await getCartSummary());
  } catch (error) {
    console.error('Cart clear error:', error);
    return json({ message: 'Error clearing cart' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const paymentMethod = body.paymentMethod as PaymentMethod;

  if (!validPaymentMethods.includes(paymentMethod)) {
    return json({ message: 'Invalid payment method.' }, { status: 400 });
  }

  try {
    await setOrderPaymentMethod(paymentMethod);
    return json(await getCartSummary());
  } catch (error) {
    console.error('Payment method update error:', error);
    return json({ message: 'Error updating payment method' }, { status: 500 });
  }
};

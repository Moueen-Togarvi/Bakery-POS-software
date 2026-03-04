import { json } from '@sveltejs/kit';
import { clearOpenOrder, getCartSummary, setOrderPaymentMethod, upsertCartItem } from '$lib/server/pos';
import {
  clearFallbackCart,
  getFallbackCart,
  setFallbackPaymentMethod,
  upsertFallbackCartItem
} from '$lib/server/fallback-cart';
import type { PaymentMethod } from '$lib/server/types';

const validPaymentMethods: PaymentMethod[] = ['Cash', 'Card', 'QR'];

export async function GET() {
  try {
    return json(await getCartSummary());
  } catch (error) {
    console.error('Cart API fallback to mock data:', error);
    return json(getFallbackCart());
  }
}

export async function POST({ request }) {
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
    console.error('Cart update fallback mode:', error);
    return json(upsertFallbackCartItem(productId, delta));
  }
}

export async function DELETE() {
  try {
    await clearOpenOrder();
    return json(await getCartSummary());
  } catch (error) {
    console.error('Cart clear fallback mode:', error);
    return json(clearFallbackCart());
  }
}

export async function PATCH({ request }) {
  const body = await request.json();
  const paymentMethod = body.paymentMethod as PaymentMethod;

  if (!validPaymentMethods.includes(paymentMethod)) {
    return json({ message: 'Invalid payment method.' }, { status: 400 });
  }

  try {
    await setOrderPaymentMethod(paymentMethod);
    return json(await getCartSummary());
  } catch (error) {
    console.error('Payment method fallback mode:', error);
    return json(setFallbackPaymentMethod(paymentMethod));
  }
}

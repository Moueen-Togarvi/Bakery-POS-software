import type { CartSummary, PaymentMethod, SaleReceipt } from './types';
import { mockCart, mockProducts } from './mock';

const TAX_RATE = 0.08;

const fallbackCart: CartSummary = JSON.parse(JSON.stringify(mockCart));
let fallbackOrderCounter = 8429;

const round2 = (value: number) => Number(value.toFixed(2));

function recalcTotals() {
  fallbackCart.subtotal = round2(fallbackCart.items.reduce((sum, item) => sum + item.lineTotal, 0));
  fallbackCart.tax = round2(fallbackCart.subtotal * TAX_RATE);
  fallbackCart.total = round2(fallbackCart.subtotal + fallbackCart.tax);
}

export function getFallbackCart() {
  return JSON.parse(JSON.stringify(fallbackCart)) as CartSummary;
}

export function clearFallbackCart() {
  fallbackCart.items = [];
  recalcTotals();
  return getFallbackCart();
}

export function setFallbackPaymentMethod(paymentMethod: PaymentMethod) {
  fallbackCart.paymentMethod = paymentMethod;
  fallbackCart.receiptIssuedAt = new Date().toISOString();
  return getFallbackCart();
}

export function upsertFallbackCartItem(productId: number, delta: number) {
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) {
    throw new Error('Product not found in fallback store');
  }

  const unitPrice = Number(product.price);
  const idx = fallbackCart.items.findIndex((item) => item.productId === productId);

  if (idx === -1) {
    if (delta <= 0) {
      return getFallbackCart();
    }
    fallbackCart.items.push({
      productId,
      name: product.name,
      imageUrl: product.imageUrl,
      quantity: delta,
      unitPrice,
      lineTotal: round2(unitPrice * delta)
    });
  } else {
    const nextQty = fallbackCart.items[idx].quantity + delta;
    if (nextQty <= 0) {
      fallbackCart.items.splice(idx, 1);
    } else {
      fallbackCart.items[idx].quantity = nextQty;
      fallbackCart.items[idx].unitPrice = unitPrice;
      fallbackCart.items[idx].lineTotal = round2(unitPrice * nextQty);
    }
  }

  recalcTotals();
  return getFallbackCart();
}

export function completeFallbackSale(): { receipt: SaleReceipt; cart: CartSummary } {
  if (!fallbackCart.items.length) {
    throw new Error('Cannot complete empty order');
  }

  const receipt: SaleReceipt = {
    receiptNo: fallbackCart.receiptNo,
    orderNo: fallbackCart.orderNo,
    customerName: fallbackCart.customerName,
    paymentMethod: fallbackCart.paymentMethod,
    issuedAt: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(fallbackCart.items)),
    subtotal: fallbackCart.subtotal,
    tax: fallbackCart.tax,
    total: fallbackCart.total
  };

  fallbackOrderCounter += 1;
  fallbackCart.orderNo = `ORD-${fallbackOrderCounter}`;
  fallbackCart.receiptNo = `RCPT-ORD-${fallbackOrderCounter}`;
  fallbackCart.receiptIssuedAt = new Date().toISOString();
  fallbackCart.items = [];
  recalcTotals();

  return {
    receipt,
    cart: getFallbackCart()
  };
}

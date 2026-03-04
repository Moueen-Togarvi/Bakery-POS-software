import {
  createMockCategory,
  createMockProduct,
  filterMockProducts,
  mockCategories,
  mockProducts
} from './mock';
import {
  clearFallbackCart,
  completeFallbackSale,
  getFallbackCart,
  setFallbackPaymentMethod,
  upsertFallbackCartItem
} from './fallback-cart';
import type { CartSummary, Category, PaymentMethod, Product, SaleReceipt } from './types';

export async function getCategories(): Promise<Category[]> {
  const allItems = mockCategories.find((category) => category.name === 'All Items');
  const others = mockCategories
    .filter((category) => category.name !== 'All Items')
    .sort((a, b) => a.name.localeCompare(b.name));

  return allItems ? [allItems, ...others] : others;
}

export async function getProducts(categoryId?: number): Promise<Product[]> {
  const rows = filterMockProducts(categoryId).slice();
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function createCategory(name: string): Promise<Category> {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error('Category name is required');
  }
  return createMockCategory(normalized);
}

export async function createProduct(input: {
  name: string;
  categoryId: number;
  price: number;
  imageUrl?: string;
}): Promise<Product> {
  if (!input.name.trim()) {
    throw new Error('Product name is required');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Valid price is required');
  }

  return createMockProduct({
    name: input.name,
    categoryId: input.categoryId,
    price: input.price,
    imageUrl: input.imageUrl
  });
}

export async function getOrCreateOpenOrder(): Promise<{ id: number; orderNo: string; customerName: string }> {
  const cart = getFallbackCart();
  return {
    id: cart.orderId,
    orderNo: cart.orderNo,
    customerName: cart.customerName
  };
}

export async function upsertCartItem(productId: number, quantityDelta: number): Promise<void> {
  upsertFallbackCartItem(productId, quantityDelta);
}

export async function clearOpenOrder(): Promise<void> {
  clearFallbackCart();
}

export async function setOrderPaymentMethod(paymentMethod: PaymentMethod): Promise<void> {
  setFallbackPaymentMethod(paymentMethod);
}

export async function completeOpenOrder(): Promise<SaleReceipt> {
  return completeFallbackSale().receipt;
}

export async function getCartSummary(): Promise<CartSummary> {
  return getFallbackCart();
}

export function getInventoryRows(): Array<{
  id: number;
  name: string;
  category: string;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
  status: string;
}> {
  return mockProducts.map((product, index) => {
    const stock = 8 + ((product.id + index) % 25);
    const reorderLevel = 10;

    return {
      id: product.id,
      name: product.name,
      category: product.categoryName,
      unitPrice: Number(product.price),
      stock,
      reorderLevel,
      status: stock <= reorderLevel ? 'Low' : 'Healthy'
    };
  });
}

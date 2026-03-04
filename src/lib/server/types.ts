export type PaymentMethod = 'Cash' | 'Card' | 'QR';

export type Category = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  price: string;
  imageUrl: string | null;
  categoryId: number;
  categoryName: string;
};

export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CartSummary = {
  orderId: number;
  orderNo: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  receiptNo: string;
  receiptIssuedAt: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
};

export type SaleReceipt = {
  receiptNo: string;
  orderNo: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  issuedAt: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
};

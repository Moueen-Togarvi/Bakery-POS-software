export type PaymentMethod = 'Cash' | 'Card' | 'QR';

export type UnitType = 'pcs' | 'kg' | 'lb';

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
  stock: number;
  sku: string | null;
  unitType: UnitType;
  flavor: string | null;
};

export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string | null;
  quantity: number; // For pieces it's int, for kg/lb it's float
  unitPrice: number;
  lineTotal: number;
  unitType: UnitType;
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

export type UserRole = 'admin' | 'cashier';

export type User = {
  id: number;
  username: string;
  role: UserRole;
  salary: number;
  joinedAt: string;
};

export type FinanceCategory = 'salary' | 'revenue' | 'expense' | 'other';

export type FinanceTransaction = {
  id: number;
  date: string;
  category: FinanceCategory;
  amount: number;
  note: string | null;
  orderId: number | null;
};

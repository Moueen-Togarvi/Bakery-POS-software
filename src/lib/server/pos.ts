import { sql, queryWithRetry } from './db';
import type { CartSummary, Category, PaymentMethod, Product, SaleReceipt, User, FinanceTransaction, UnitType } from './types';

const DEFAULT_TAX_RATE = 0.20;
const CUSTOMER_NAME = 'Walk-in Customer';
const SETTINGS_CACHE_TTL_MS = 60_000;
const settingsCache = new Map<string, { value: string | null; expiresAt: number }>();
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Card', 'QR'];

// ── helpers ──────────────────────────────────────────────────────────────────

const round2 = (v: number) => Number(Number(v).toFixed(2));

const parseTaxRate = (raw: string | null) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_TAX_RATE;
  const ratio = value >= 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, ratio));
};

async function buildCartSummary(): Promise<CartSummary> {
  const items = await queryWithRetry(`
    SELECT
      ci.product_id  AS "productId",
      p.name,
      p.image_url    AS "imageUrl",
      ci.quantity::float,
      p.price::float AS "unitPrice",
      p.buying_price::float AS "buyingPrice",
      p.stock        AS "currentStock",
      p.unit_type    AS "unitType",
      p.flavor
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    ORDER BY ci.id
  `);

  const cartItems = items.map((r: any) => ({
    productId: r.productId,
    name: r.name,
    imageUrl: r.imageUrl,
    quantity: Number(r.quantity),
    unitPrice: round2(Number(r.unitPrice)),
    buyingPrice: round2(Number(r.buyingPrice)),
    lineTotal: round2(Number(r.unitPrice) * Number(r.quantity)),
    unitType: r.unitType as UnitType,
    flavor: r.flavor
  }));

  const subtotal = round2(cartItems.reduce((s: number, i: any) => s + i.lineTotal, 0));
  const [openPaymentMethod, taxRateSetting] = await Promise.all([
    getSetting('open_payment_method'),
    getSetting('tax_rate')
  ]);
  const taxRate = parseTaxRate(taxRateSetting);
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  const paymentMethod = PAYMENT_METHODS.includes(openPaymentMethod as PaymentMethod)
    ? (openPaymentMethod as PaymentMethod)
    : 'Cash';

  return {
    orderId: 0,
    orderNo: 'ORD-ACTIVE',
    customerName: CUSTOMER_NAME,
    paymentMethod,
    receiptNo: 'RCPT-PENDING',
    receiptIssuedAt: new Date().toISOString(),
    items: cartItems,
    subtotal,
    tax,
    total
  };
}

// ── Categories & Products ─────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const rows = await queryWithRetry(
    `SELECT id, name FROM categories ORDER BY (CASE WHEN name = 'All Items' THEN 0 ELSE 1 END), name`
  );
  const hasAll = rows.some((c: any) => c.name === 'All Items');
  if (!hasAll) {
    return [{ id: 0, name: 'All Items' }, ...rows];
  }
  return rows;
}

export async function getProducts(categoryId?: number): Promise<Product[]> {
  const rows = await queryWithRetry(
    `SELECT p.id, p.name, p.price::text, p.image_url AS "imageUrl",
            p.category_id AS "categoryId", c.name AS "categoryName",
            p.buying_price::text AS "buyingPrice",
            p.stock, p.sku, p.unit_type AS "unitType", p.flavor
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE ($1::int IS NULL OR $1 = 0 OR p.category_id = $1)
     ORDER BY p.name`,
    [categoryId || 0]
  );
  return rows;
}

export async function createCategory(name: string): Promise<Category> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Category name is required');
  const rows = await queryWithRetry(
    `INSERT INTO categories (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [normalized]
  );
  return rows[0];
}

export async function updateCategory(id: number, name: string): Promise<Category> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Category name is required');
  if (id === 0) throw new Error('Cannot update default category');

  const rows = await queryWithRetry(
    `UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name`,
    [id, normalized]
  );
  if (!rows.length) throw new Error('Category not found');
  return rows[0];
}

export async function deleteCategory(id: number): Promise<void> {
  if (id === 0) throw new Error('Cannot delete default category');

  // Check if category has products
  const products = await queryWithRetry('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
  if (products.length > 0) {
    throw new Error('Cannot delete category with products. Please move or delete products first.');
  }

  const result = await queryWithRetry('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (!result.length) throw new Error('Category not found');
}

export async function createProduct(input: {
  name: string;
  categoryId: number;
  price: number;
  buyingPrice?: number;
  imageUrl?: string;
  stock?: number;
  sku?: string;
  unitType?: UnitType;
  flavor?: string;
}): Promise<Product> {
  if (!input.name.trim()) throw new Error('Product name is required');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Valid price is required');
  if (input.stock !== undefined && input.stock < 0) throw new Error('Stock cannot be negative');

  const rows = await queryWithRetry(
    `INSERT INTO products (name, price, buying_price, image_url, category_id, stock, sku, unit_type, flavor)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (name) DO UPDATE SET
       price = EXCLUDED.price,
       buying_price = EXCLUDED.buying_price,
       image_url = EXCLUDED.image_url,
       category_id = EXCLUDED.category_id,
       stock = EXCLUDED.stock,
       sku = EXCLUDED.sku,
       unit_type = EXCLUDED.unit_type,
       flavor = EXCLUDED.flavor
     RETURNING id, name, price::text, buying_price::text AS "buyingPrice", image_url AS "imageUrl", category_id AS "categoryId", stock, sku, unit_type AS "unitType", flavor`,
    [
      input.name.trim(),
      input.price,
      input.buyingPrice || 0,
      input.imageUrl || null,
      input.categoryId,
      input.stock || 0,
      input.sku || null,
      input.unitType || 'pcs',
      input.flavor || null
    ]
  );
  const catRows = await queryWithRetry('SELECT name FROM categories WHERE id = $1', [input.categoryId]);
  return { ...rows[0], categoryName: catRows[0]?.name || '' };
}

export async function updateProduct(input: {
  id: number;
  name: string;
  categoryId: number;
  price: number;
  buyingPrice?: number;
  imageUrl?: string;
  stock?: number;
  sku?: string;
  unitType?: UnitType;
  flavor?: string;
}): Promise<Product> {
  if (!Number.isInteger(input.id) || input.id <= 0) throw new Error('Valid product id is required');
  if (!input.name.trim()) throw new Error('Product name is required');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Valid price is required');
  if (input.stock !== undefined && input.stock < 0) throw new Error('Stock cannot be negative');

  const rows = await queryWithRetry(
    `UPDATE products
     SET name = $2,
         price = $3,
         buying_price = $4,
         image_url = $5,
         category_id = $6,
         stock = $7,
         sku = $8,
         unit_type = $9,
         flavor = $10
     WHERE id = $1
     RETURNING id, name, price::text, buying_price::text AS "buyingPrice", image_url AS "imageUrl", category_id AS "categoryId", stock, sku, unit_type AS "unitType", flavor`,
    [
      input.id,
      input.name.trim(),
      input.price,
      input.buyingPrice || 0,
      input.imageUrl || null,
      input.categoryId,
      input.stock || 0,
      input.sku || null,
      input.unitType || 'pcs',
      input.flavor || null
    ]
  );

  if (!rows.length) throw new Error('Product not found');

  const catRows = await queryWithRetry('SELECT name FROM categories WHERE id = $1', [input.categoryId]);
  return { ...rows[0], categoryName: catRows[0]?.name || '' };
}

export async function deleteProduct(productId: number): Promise<void> {
  if (!Number.isInteger(productId) || productId <= 0) throw new Error('Valid product id is required');

  // Instead of throwing an error for past sales, we unlink the product from historical order items.
  // Historical order items already snapshot the name, price, and cost, so reports remain accurate.
  await queryWithRetry('UPDATE order_items SET product_id = NULL WHERE product_id = $1', [productId]);

  await queryWithRetry('DELETE FROM cart_items WHERE product_id = $1', [productId]);
  const result = await queryWithRetry('DELETE FROM products WHERE id = $1 RETURNING id', [productId]);
  if (!result.length) throw new Error('Product not found');
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function getCartSummary(): Promise<CartSummary> {
  return buildCartSummary();
}

export async function getOrCreateOpenOrder() {
  const cart = await buildCartSummary();
  return { id: 0, orderNo: cart.orderNo, customerName: cart.customerName };
}

export async function upsertCartItem(productId: number, quantityDelta: number): Promise<void> {
  if (quantityDelta > 0) {
    await queryWithRetry(
      `INSERT INTO cart_items (product_id, quantity)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE
         SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [productId, quantityDelta]
    );
  } else {
    // decrement – remove if quantity reaches 0 or below
    await queryWithRetry(
      `UPDATE cart_items SET quantity = quantity + $2
       WHERE product_id = $1`,
      [productId, quantityDelta]
    );
    await queryWithRetry(
      `DELETE FROM cart_items WHERE product_id = $1 AND quantity <= 0`,
      [productId]
    );
  }
}

export async function clearOpenOrder(): Promise<void> {
  await queryWithRetry('DELETE FROM cart_items');
}

export async function setOrderPaymentMethod(_paymentMethod: PaymentMethod): Promise<void> {
  const paymentMethod = PAYMENT_METHODS.includes(_paymentMethod) ? _paymentMethod : 'Cash';
  await updateSetting('open_payment_method', paymentMethod);
}

export async function completeOpenOrder(paymentMethod?: PaymentMethod): Promise<SaleReceipt> {
  const cart = await buildCartSummary();

  if (!cart.items.length) throw new Error('Cannot complete empty order');

  // Verify sufficient stock for all items
  for (const item of cart.items) {
    if (item.currentStock < item.quantity) {
      throw new Error(`Insufficient stock for "${item.name}". Available: ${item.currentStock}, Requested: ${item.quantity}`);
    }
  }

  const pm: PaymentMethod = paymentMethod ?? 'Cash';

  // Generate unique order number
  const ts = Date.now();
  const orderNo = `ORD-${ts}`;
  const receiptNo = `RCPT-${ts}`;
  const issuedAt = new Date().toISOString();

  // Insert order
  const orderRows = await queryWithRetry(
    `INSERT INTO orders (order_no, customer_name, payment_method, receipt_no, subtotal, tax, total, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
     RETURNING id`,
    [orderNo, CUSTOMER_NAME, pm, receiptNo, cart.subtotal, cart.tax, cart.total]
  );
  const orderId = orderRows[0].id;

  // Batch insert order items
  const itemPlaceholders = cart.items.map((_, i) =>
    `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`
  ).join(', ');

  const itemParams: any[] = [orderId];
  for (const item of cart.items) {
    itemParams.push(
      item.productId,
      item.name,
      item.imageUrl,
      item.quantity,
      item.unitPrice,
      item.lineTotal,
      (item as any).flavor,
      (item as any).buyingPrice || 0
    );
  }

  await queryWithRetry(
    `INSERT INTO order_items (order_id, product_id, name, image_url, quantity, unit_price, line_total, flavor, cost_price)
     VALUES ${itemPlaceholders}`,
    itemParams
  );

  // Batch update stock
  // We use a CTE to update stock in one go for efficiency
  const stockPlaceholders = cart.items.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::float)`).join(', ');
  const stockParams: any[] = [];
  for (const item of cart.items) {
    stockParams.push(item.productId, item.quantity);
  }

  await queryWithRetry(
    `UPDATE products AS p
     SET stock = p.stock - v.qty
     FROM (VALUES ${stockPlaceholders}) AS v(id, qty)
     WHERE p.id = v.id`,
    stockParams
  );

  // Clear cart
  await queryWithRetry('DELETE FROM cart_items');
  await updateSetting('open_payment_method', 'Cash');

  return {
    receiptNo,
    orderNo,
    customerName: CUSTOMER_NAME,
    paymentMethod: pm,
    issuedAt,
    items: cart.items,
    subtotal: cart.subtotal,
    tax: cart.tax,
    total: cart.total
  };
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventoryRows() {
  const products = await getProducts();
  return products.map((product) => {
    const reorderLevel = 10;
    const sellingPrice = Number(product.price);
    const buyingPrice = Number(product.buyingPrice || 0);
    return {
      id: product.id,
      name: product.name,
      category: product.categoryName,
      imageUrl: product.imageUrl,
      unitPrice: sellingPrice,
      buyingPrice,
      unitProfit: round2(sellingPrice - buyingPrice),
      stock: product.stock,
      reorderLevel,
      status: product.stock <= reorderLevel ? 'Low' : 'Healthy',
      sku: product.sku,
      unitType: product.unitType,
      flavor: product.flavor
    };
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getSalesReport(options?: {
  search?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
  baseDate?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const search = options?.search?.trim() || '';
  const period = options?.period || 'daily';
  const baseDate = options?.baseDate || '';
  const dateFrom = options?.dateFrom || '';
  const dateTo = options?.dateTo || '';

  const baseFilters: string[] = [];
  const baseParams: any[] = [];

  if (search) {
    baseParams.push(`%${search}%`);
    const p = `$${baseParams.length}`;
    baseFilters.push(`(o.order_no ILIKE ${p} OR o.customer_name ILIKE ${p} OR o.status ILIKE ${p})`);
  }

  if (period === 'custom' && dateFrom) {
    baseParams.push(dateFrom);
    baseFilters.push(`o.receipt_issued_at::date >= $${baseParams.length}::date`);
  }
  if (period === 'custom' && dateTo) {
    baseParams.push(dateTo);
    baseFilters.push(`o.receipt_issued_at::date <= $${baseParams.length}::date`);
  }
  if (period === 'daily') {
    if (baseDate) {
      baseParams.push(baseDate);
      baseFilters.push(`o.receipt_issued_at::date = $${baseParams.length}::date`);
    } else {
      // Use UTC+5 (Karachi time) to determine the start of "Today"
      baseFilters.push(`o.receipt_issued_at >= (NOW() + INTERVAL '5 hours')::date - INTERVAL '5 hours'`);
    }
  }
  if (period === 'weekly') {
    if (baseDate) {
      baseParams.push(baseDate);
      const p = `$${baseParams.length}::date`;
      baseFilters.push(`o.receipt_issued_at::date BETWEEN (${p} - INTERVAL '6 days') AND ${p}`);
    } else {
      baseFilters.push(`o.receipt_issued_at::date >= CURRENT_DATE - INTERVAL '6 days'`);
    }
  }
  if (period === 'monthly') {
    if (baseDate) {
      baseParams.push(baseDate);
      const p = `$${baseParams.length}::date`;
      baseFilters.push(`o.receipt_issued_at::date BETWEEN (${p} - INTERVAL '29 days') AND ${p}`);
    } else {
      baseFilters.push(`o.receipt_issued_at::date >= CURRENT_DATE - INTERVAL '29 days'`);
    }
  }

  const completedWhere = `WHERE o.status = 'completed'${baseFilters.length ? ` AND ${baseFilters.join(' AND ')}` : ''}`;
  const completedWhereO2 = `WHERE o2.status = 'completed'${baseFilters.length ? ` AND ${baseFilters.join(' AND ').replace(/\bo\./g, 'o2.')}` : ''}`;
  const ordersWhere = `WHERE ${baseFilters.length ? baseFilters.join(' AND ') : 'TRUE'}`;

  const [totalsRows, topItemsRows, recentOrdersRows] = await Promise.all([
    (sql as any).query(
      `
      SELECT
        COUNT(*)::int                                    AS "totalOrders",
        COALESCE(SUM(o.total), 0)                        AS "totalRevenue",
        COALESCE(SUM(o.subtotal), 0)                     AS "netSales",
        COALESCE(AVG(o.total), 0)                        AS "avgOrderValue",
        (
          SELECT COALESCE(SUM(oi.cost_price * oi.quantity), 0)
          FROM order_items oi
          JOIN orders o2 ON o2.id = oi.order_id
          ${completedWhereO2}
        )                                                AS "totalCost",
        (
          SELECT COUNT(*)::int
          FROM orders o3
          WHERE o3.status = 'returned'${baseFilters.length ? ` AND ${baseFilters.join(' AND ').replace(/\bo\./g, 'o3.')}` : ''}
        )                                                AS "totalReturns"
      FROM orders o
      ${completedWhere}
    `,
      baseParams
    ),
    (sql as any).query(
      `
      SELECT
        oi.name,
        SUM(oi.quantity)::float   AS "totalQty",
        SUM(oi.line_total)        AS "totalRevenue",
        SUM(oi.cost_price * oi.quantity) AS "totalCost"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${completedWhere}
      GROUP BY oi.name
      ORDER BY "totalQty" DESC
      LIMIT 5
    `,
      baseParams
    ),
    (sql as any).query(
      `
      SELECT
        o.id,
        o.order_no AS "orderNo",
        o.payment_method AS "paymentMethod",
        o.total,
        o.receipt_issued_at AS "issuedAt",
        o.status
      FROM orders o
      ${ordersWhere}
      ORDER BY o.receipt_issued_at DESC
      LIMIT 50
    `,
      baseParams
    )
  ]);

  const t = totalsRows[0];
  const totalRevenue = round2(Number(t.totalRevenue));
  const netSales = round2(Number(t.netSales));
  const totalCost = round2(Number(t.totalCost));
  // Profit must be based on subtotal (selling price without tax) minus buying cost
  const grossProfit = round2(netSales - totalCost);

  return {
    totalOrders: t.totalOrders,
    totalRevenue,
    netSales,
    totalCost,
    grossProfit,
    totalReturns: t.totalReturns || 0,
    profitMargin: netSales > 0 ? round2((grossProfit / netSales) * 100) : 0,
    avgOrderValue: round2(Number(t.avgOrderValue)),
    topItems: topItemsRows.map((r: any) => ({
      name: r.name,
      totalQty: round2(Number(r.totalQty)),
      totalRevenue: round2(Number(r.totalRevenue)),
      totalCost: round2(Number(r.totalCost || 0)),
      grossProfit: round2(Number(r.totalRevenue) - Number(r.totalCost || 0))
    })),
    recentOrders: recentOrdersRows.map((r: any) => ({
      id: r.id,
      orderNo: r.orderNo,
      paymentMethod: r.paymentMethod,
      total: round2(Number(r.total)),
      issuedAt: r.issuedAt,
      status: r.status
    }))
  };
}

export async function getRecentOrders(limit = 5) {
  const rows = await queryWithRetry(
    `SELECT
      o.id,
      o.order_no AS "orderNo",
      o.customer_name AS "customerName",
      o.payment_method AS "paymentMethod",
      o.subtotal,
      o.tax,
      o.total,
      o.receipt_issued_at AS "issuedAt",
      o.status,
      COALESCE(SUM(oi.quantity), 0)::float AS "itemCount"
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id, o.order_no, o.customer_name, o.payment_method, o.subtotal, o.tax, o.total, o.receipt_issued_at, o.status
     ORDER BY o.receipt_issued_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((r: any) => ({
    id: r.id,
    orderNo: r.orderNo,
    customerName: r.customerName,
    paymentMethod: r.paymentMethod,
    subtotal: round2(Number(r.subtotal || 0)),
    tax: round2(Number(r.tax || 0)),
    total: round2(Number(r.total)),
    itemCount: round2(Number(r.itemCount || 0)),
    issuedAt: r.issuedAt,
    status: r.status
  }));
}

export async function returnOrder(orderId: number): Promise<void> {
  const orderRows = await queryWithRetry('SELECT status FROM orders WHERE id = $1', [orderId]);
  if (!orderRows.length) throw new Error('Order not found');
  if (orderRows[0].status === 'returned') throw new Error('Order already returned');

  // Update order status
  await queryWithRetry('UPDATE orders SET status = \'returned\' WHERE id = $1', [orderId]);

  // Restock items
  const items = await queryWithRetry('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
  for (const item of items) {
    if (item.product_id) {
      await queryWithRetry('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }
  }
}

// ── Users & Staff ─────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const rows = await queryWithRetry('SELECT id, username, role, salary::float, joined_at AS "joinedAt" FROM users ORDER BY username');
  return rows;
}

export async function upsertUser(input: {
  username: string;
  passwordHash?: string;
  role: string;
  salary?: number;
}): Promise<void> {
  const password = input.passwordHash || input.username; // Use username as default password if not provided

  await queryWithRetry(
    `INSERT INTO users (username, password_hash, role, salary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = CASE WHEN EXCLUDED.password_hash != EXCLUDED.username THEN EXCLUDED.password_hash ELSE users.password_hash END,
       role = EXCLUDED.role,
       salary = EXCLUDED.salary`,
    [input.username, password, input.role, input.salary || 0]
  );
}

export async function updateUser(input: {
  id: number;
  role: string;
  salary?: number;
  passwordHash?: string;
}): Promise<void> {
  if (!Number.isInteger(input.id) || input.id <= 0) throw new Error('Valid user id is required');

  await queryWithRetry(
    `UPDATE users
     SET role = $2,
         salary = $3,
         password_hash = COALESCE(NULLIF($4, ''), password_hash)
     WHERE id = $1`,
    [input.id, input.role, input.salary || 0, input.passwordHash || '']
  );
}

export async function deleteUser(userId: number): Promise<void> {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Valid user id is required');
  await queryWithRetry('DELETE FROM users WHERE id = $1', [userId]);
}

// ── Finance & Expenses ────────────────────────────────────────────────────────

export async function logFinanceTransaction(input: {
  category: string;
  amount: number;
  note?: string;
  orderId?: number;
}): Promise<void> {
  await queryWithRetry(
    `INSERT INTO finance_transactions (category, amount, note, order_id)
     VALUES ($1, $2, $3, $4)`,
    [input.category, input.amount, input.note || null, input.orderId || null]
  );
}

export async function getFinancialSummary(): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  totalSalaries: number;
  netProfit: number;
}> {
  const revenueRows = await queryWithRetry('SELECT SUM(total)::float as total FROM orders WHERE status = \'completed\'');
  const expenseRows = await queryWithRetry('SELECT category, SUM(amount)::float as total FROM finance_transactions GROUP BY category');

  const totalRevenue = revenueRows[0].total || 0;
  let totalExpenses = 0;
  let totalSalaries = 0;
  let extraIncome = 0;

  expenseRows.forEach((row: any) => {
    if (row.category === 'salary') totalSalaries = row.total;
    else if (row.category === 'expense') totalExpenses = row.total;
    else if (row.category === 'income') extraIncome = row.total;
  });

  return {
    totalRevenue,
    totalExpenses,
    totalSalaries,
    netProfit: (totalRevenue + extraIncome) - totalExpenses - totalSalaries
  };
}

// ── App Settings ──────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const rows = await queryWithRetry('SELECT value FROM settings WHERE key = $1', [key]);
  const value = rows[0]?.value || null;
  settingsCache.set(key, { value, expiresAt: now + SETTINGS_CACHE_TTL_MS });
  return value;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await queryWithRetry(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
  settingsCache.set(key, { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS });
}

export async function getOrderReceipt(orderId: number): Promise<SaleReceipt> {
  const orderRows = await queryWithRetry('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!orderRows.length) throw new Error('Order not found');
  const order = orderRows[0];

  const itemRows = await queryWithRetry('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  const items = itemRows.map((r: any) => ({
    productId: r.product_id,
    name: r.name,
    imageUrl: r.image_url,
    quantity: r.quantity,
    unitPrice: Number(r.unit_price),
    lineTotal: Number(r.line_total),
    flavor: r.flavor
  }));

  return {
    receiptNo: order.receipt_no,
    orderNo: order.order_no,
    customerName: order.customer_name,
    paymentMethod: order.payment_method,
    issuedAt: order.receipt_issued_at.toISOString(),
    items,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total)
  };
}

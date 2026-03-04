import { sql, queryWithRetry } from './db';
import type { CartSummary, Category, PaymentMethod, Product, SaleReceipt, User, FinanceTransaction, UnitType } from './types';

const TAX_RATE = 0.08; // Tax restored as per user request
const CUSTOMER_NAME = 'Walk-in Customer';

// ── helpers ──────────────────────────────────────────────────────────────────

const round2 = (v: number) => Number(Number(v).toFixed(2));

async function buildCartSummary(): Promise<CartSummary> {
  const items = await queryWithRetry(`
    SELECT
      ci.product_id  AS "productId",
      p.name,
      p.image_url    AS "imageUrl",
      ci.quantity::float,
      p.price::float AS "unitPrice",
      p.stock        AS "currentStock",
      p.unit_type    AS "unitType"
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
    lineTotal: round2(Number(r.unitPrice) * Number(r.quantity)),
    unitType: r.unitType as UnitType
  }));

  const subtotal = round2(cartItems.reduce((s: number, i: any) => s + i.lineTotal, 0));
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + tax);

  return {
    orderId: 0,
    orderNo: 'ORD-ACTIVE',
    customerName: CUSTOMER_NAME,
    paymentMethod: 'Cash',
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
            p.stock, p.sku, p.unit_type AS "unitType"
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

export async function createProduct(input: {
  name: string;
  categoryId: number;
  price: number;
  imageUrl?: string;
  stock?: number;
  sku?: string;
  unitType?: UnitType;
}): Promise<Product> {
  if (!input.name.trim()) throw new Error('Product name is required');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Valid price is required');

  const rows = await queryWithRetry(
    `INSERT INTO products (name, price, image_url, category_id, stock, sku, unit_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (name) DO UPDATE SET
       price = EXCLUDED.price,
       image_url = EXCLUDED.image_url,
       category_id = EXCLUDED.category_id,
       stock = EXCLUDED.stock,
       sku = EXCLUDED.sku,
       unit_type = EXCLUDED.unit_type
     RETURNING id, name, price::text, image_url AS "imageUrl", category_id AS "categoryId", stock, sku, unit_type AS "unitType"`,
    [input.name.trim(), input.price, input.imageUrl || null, input.categoryId, input.stock || 0, input.sku || null, input.unitType || 'pcs']
  );
  const catRows = await queryWithRetry('SELECT name FROM categories WHERE id = $1', [input.categoryId]);
  return { ...rows[0], categoryName: catRows[0]?.name || '' };
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
  // payment method is ephemeral until order is placed – stored in session/UI state
  // No DB action needed here; it will be passed in completeOpenOrder
}

export async function completeOpenOrder(paymentMethod?: PaymentMethod): Promise<SaleReceipt> {
  const cart = await buildCartSummary();

  if (!cart.items.length) throw new Error('Cannot complete empty order');

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

  // Insert order items and decrement stock
  for (const item of cart.items) {
    await queryWithRetry(
      `INSERT INTO order_items (order_id, product_id, name, image_url, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orderId, item.productId, item.name, item.imageUrl, item.quantity, item.unitPrice, item.lineTotal]
    );
    await queryWithRetry(
      `UPDATE products SET stock = stock - $1 WHERE id = $2`,
      [item.quantity, item.productId]
    );
  }

  // Clear cart
  await queryWithRetry('DELETE FROM cart_items');

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
    return {
      id: product.id,
      name: product.name,
      category: product.categoryName,
      unitPrice: Number(product.price),
      stock: product.stock,
      reorderLevel,
      status: product.stock <= reorderLevel ? 'Low' : 'Healthy',
      sku: product.sku,
      unitType: product.unitType
    };
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getSalesReport(search?: string) {
  const whereClause = search ? `WHERE (order_no ILIKE $1 OR customer_name ILIKE $1 OR status ILIKE $1)` : '';
  const searchParams = search ? [`%${search}%`] : [];

  const [totalsRows, topItemsRows, recentOrdersRows] = await Promise.all([
    (sql as any).query(`
      SELECT
        COUNT(*)::int              AS "totalOrders",
        COALESCE(SUM(total), 0)    AS "totalRevenue",
        COALESCE(AVG(total), 0)    AS "avgOrderValue"
      FROM orders
      ${whereClause && search ? 'WHERE status = \'completed\' AND ' + whereClause.substring(6) : 'WHERE status = \'completed\''}
    `, searchParams),
    (sql as any).query(`
      SELECT
        oi.name,
        SUM(oi.quantity)::int   AS "totalQty",
        SUM(oi.line_total)      AS "totalRevenue"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'completed'
      GROUP BY oi.name
      ORDER BY "totalQty" DESC
      LIMIT 5
    `),
    (sql as any).query(`
      SELECT
        id, order_no AS "orderNo",
        payment_method AS "paymentMethod",
        total,
        receipt_issued_at AS "issuedAt",
        status
      FROM orders
      ${whereClause}
      ORDER BY receipt_issued_at DESC
      LIMIT 20
    `, searchParams)
  ]);

  const t = totalsRows[0];
  return {
    totalOrders: t.totalOrders,
    totalRevenue: round2(Number(t.totalRevenue)),
    avgOrderValue: round2(Number(t.avgOrderValue)),
    topItems: topItemsRows.map((r: any) => ({
      name: r.name,
      totalQty: r.totalQty,
      totalRevenue: round2(Number(r.totalRevenue))
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
  if (input.passwordHash) {
    await queryWithRetry(
      `INSERT INTO users (username, password_hash, role, salary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         salary = EXCLUDED.salary`,
      [input.username, input.passwordHash, input.role, input.salary || 0]
    );
  } else {
    await queryWithRetry(
      `UPDATE users SET
         role = $2,
         salary = $3
       WHERE username = $1`,
      [input.username, input.role, input.salary || 0]
    );
  }
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

  expenseRows.forEach((row: any) => {
    if (row.category === 'salary') totalSalaries = row.total;
    else if (row.category === 'expense') totalExpenses = row.total;
  });

  return {
    totalRevenue,
    totalExpenses,
    totalSalaries,
    netProfit: totalRevenue - totalExpenses - totalSalaries
  };
}

// ── App Settings ──────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const rows = await queryWithRetry('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0]?.value || null;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await queryWithRetry(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
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
    lineTotal: Number(r.line_total)
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

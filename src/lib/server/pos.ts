import { getSql } from './db';
import type { CartSummary, Category, PaymentMethod, Product, SaleReceipt } from './types';

const TAX_RATE = 0.08;
const paymentMethodsByOrder = new Map<number, PaymentMethod>();

const toMoney = (value: number) => Number(value.toFixed(2));

export async function getCategories(): Promise<Category[]> {
  const sql = getSql();
  const rows = await sql<Category[]>`
    select id, name
    from categories
    order by
      case when name = 'All Items' then 0 else 1 end,
      name asc;
  `;
  return rows;
}

export async function getProducts(categoryId?: number): Promise<Product[]> {
  const sql = getSql();
  const rows = categoryId
    ? await sql<Product[]>`
        select p.id, p.name, p.price::text as price, p.image_url as "imageUrl", p.category_id as "categoryId", c.name as "categoryName"
        from products p
        join categories c on c.id = p.category_id
        where p.is_active = true and p.category_id = ${categoryId}
        order by p.name asc;
      `
    : await sql<Product[]>`
        select p.id, p.name, p.price::text as price, p.image_url as "imageUrl", p.category_id as "categoryId", c.name as "categoryName"
        from products p
        join categories c on c.id = p.category_id
        where p.is_active = true
        order by p.name asc;
      `;

  return rows;
}

export async function createCategory(name: string): Promise<Category> {
  const sql = getSql();
  const normalized = name.trim();
  if (!normalized) {
    throw new Error('Category name is required');
  }

  const created = await sql<Category[]>`
    insert into categories(name)
    values (${normalized})
    on conflict (name) do update set name = excluded.name
    returning id, name;
  `;

  return created[0];
}

export async function createProduct(input: {
  name: string;
  categoryId: number;
  price: number;
  imageUrl?: string;
}): Promise<Product> {
  const sql = getSql();
  if (!input.name.trim()) {
    throw new Error('Product name is required');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Valid price is required');
  }

  const rows = await sql<Product[]>`
    with inserted as (
      insert into products(category_id, name, price, image_url, is_active)
      values (${input.categoryId}, ${input.name.trim()}, ${toMoney(input.price)}, ${input.imageUrl?.trim() || null}, true)
      returning id, name, price::text as price, image_url as "imageUrl", category_id as "categoryId"
    )
    select i.id, i.name, i.price, i."imageUrl", i."categoryId", c.name as "categoryName"
    from inserted i
    join categories c on c.id = i."categoryId";
  `;

  return rows[0];
}

export async function getOrCreateOpenOrder(): Promise<{ id: number; orderNo: string; customerName: string }> {
  const sql = getSql();
  const open = await sql<{ id: number; orderNo: string; customerName: string }[]>`
    select id, order_no as "orderNo", customer_name as "customerName"
    from sales_orders
    where status = 'open'
    order by id desc
    limit 1;
  `;

  if (open.length) {
    return open[0];
  }

  const created = await sql<{ id: number; orderNo: string; customerName: string }[]>`
    insert into sales_orders(order_no, customer_name, status)
    values (
      'ORD-' || to_char(now(), 'YYMMDDHH24MISS'),
      'Walk-in Customer',
      'open'
    )
    returning id, order_no as "orderNo", customer_name as "customerName";
  `;

  return created[0];
}

export async function upsertCartItem(productId: number, quantityDelta: number): Promise<void> {
  const sql = getSql();
  const order = await getOrCreateOpenOrder();

  const productRows = await sql<{ id: number; price: string }[]>`
    select id, price::text as price from products where id = ${productId} and is_active = true limit 1;
  `;

  if (!productRows.length) {
    throw new Error('Product not found');
  }

  const unitPrice = Number(productRows[0].price);

  const existing = await sql<{ id: number; quantity: number }[]>`
    select id, quantity
    from sales_order_items
    where order_id = ${order.id} and product_id = ${productId}
    limit 1;
  `;

  const newQty = (existing[0]?.quantity ?? 0) + quantityDelta;

  if (newQty <= 0 && existing.length) {
    await sql`delete from sales_order_items where id = ${existing[0].id};`;
  } else if (newQty > 0 && existing.length) {
    await sql`
      update sales_order_items
      set quantity = ${newQty},
          unit_price = ${unitPrice},
          line_total = ${toMoney(unitPrice * newQty)}
      where id = ${existing[0].id};
    `;
  } else if (newQty > 0) {
    await sql`
      insert into sales_order_items(order_id, product_id, quantity, unit_price, line_total)
      values (${order.id}, ${productId}, ${newQty}, ${unitPrice}, ${toMoney(unitPrice * newQty)});
    `;
  }

  await recomputeOrderTotals(order.id);
}

export async function clearOpenOrder(): Promise<void> {
  const sql = getSql();
  const order = await getOrCreateOpenOrder();
  await sql`delete from sales_order_items where order_id = ${order.id};`;
  await recomputeOrderTotals(order.id);
}

export async function setOrderPaymentMethod(paymentMethod: PaymentMethod): Promise<void> {
  const order = await getOrCreateOpenOrder();
  paymentMethodsByOrder.set(order.id, paymentMethod);
}

export async function completeOpenOrder(): Promise<SaleReceipt> {
  const sql = getSql();
  const cart = await getCartSummary();
  if (!cart.items.length) {
    throw new Error('Cannot complete empty order');
  }

  await sql`update sales_orders set status = 'paid' where id = ${cart.orderId};`;

  return {
    receiptNo: cart.receiptNo,
    orderNo: cart.orderNo,
    customerName: cart.customerName,
    paymentMethod: cart.paymentMethod,
    issuedAt: cart.receiptIssuedAt,
    items: cart.items,
    subtotal: cart.subtotal,
    tax: cart.tax,
    total: cart.total
  };
}

async function recomputeOrderTotals(orderId: number): Promise<void> {
  const sql = getSql();
  const totals = await sql<{ subtotal: string }[]>`
    select coalesce(sum(line_total), 0)::text as subtotal
    from sales_order_items
    where order_id = ${orderId};
  `;

  const subtotal = Number(totals[0]?.subtotal ?? '0');
  const tax = toMoney(subtotal * TAX_RATE);
  const total = toMoney(subtotal + tax);

  await sql`
    update sales_orders
    set subtotal = ${subtotal}, tax = ${tax}, total = ${total}
    where id = ${orderId};
  `;
}

export async function getCartSummary(): Promise<CartSummary> {
  const sql = getSql();
  const order = await getOrCreateOpenOrder();

  const items = await sql<CartSummary['items']>`
    select soi.product_id as "productId",
           p.name,
           p.image_url as "imageUrl",
           soi.quantity,
           soi.unit_price::float8 as "unitPrice",
           soi.line_total::float8 as "lineTotal"
    from sales_order_items soi
    join products p on p.id = soi.product_id
    where soi.order_id = ${order.id}
    order by soi.id asc;
  `;

  const totals = await sql<{ subtotal: number; tax: number; total: number }[]>`
    select subtotal::float8 as subtotal, tax::float8 as tax, total::float8 as total
    from sales_orders
    where id = ${order.id}
    limit 1;
  `;

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    paymentMethod: paymentMethodsByOrder.get(order.id) ?? 'Cash',
    receiptNo: `RCPT-${order.orderNo}`,
    receiptIssuedAt: new Date().toISOString(),
    items,
    subtotal: totals[0]?.subtotal ?? 0,
    tax: totals[0]?.tax ?? 0,
    total: totals[0]?.total ?? 0
  };
}

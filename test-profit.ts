import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config();
const sql = neon(process.env.DATABASE_URL!);

async function checkProfit() {
    const result = await sql`
    SELECT
      COUNT(*)::int AS "totalOrders",
      SUM(o.total)  AS "totalRevenue",
      SUM(o.subtotal) AS "netSales",
      (
        SELECT SUM(oi.cost_price * oi.quantity)
        FROM order_items oi
        JOIN orders o2 ON o2.id = oi.order_id
        WHERE o2.status = 'completed' AND o2.receipt_issued_at::date = CURRENT_DATE
      ) AS "totalCost"
    FROM orders o
    WHERE o.status = 'completed' AND o.receipt_issued_at::date = CURRENT_DATE
  `;
    console.log('Main Query Result:', result[0]);

    const items = await sql`
    SELECT oi.id, oi.name, oi.unit_price, oi.cost_price, oi.quantity, oi.line_total
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'completed' AND o.receipt_issued_at::date = CURRENT_DATE
    LIMIT 10
  `;
    console.log('Order Items:', items);
}

checkProfit().catch(console.error);

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function check() {
    console.log('--- Categories ---');
    const categories = await (sql as any).query('SELECT * FROM categories');
    console.table(categories);

    console.log('\n--- Products (first 10) ---');
    const products = await (sql as any).query('SELECT p.id, p.name, p.price, p.stock, c.name as category FROM products p JOIN categories c ON p.category_id = c.id LIMIT 10');
    console.table(products);

    console.log('\n--- Recent Orders ---');
    const orders = await (sql as any).query('SELECT id, order_no, total, status, receipt_issued_at FROM orders ORDER BY receipt_issued_at DESC LIMIT 10');
    console.table(orders);
}

check().catch(console.error);

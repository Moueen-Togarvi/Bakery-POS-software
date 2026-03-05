import { sql } from '../src/lib/server/db';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
    try {
        const now = new Date();
        console.log('Current local time:', now.toString());
        console.log('Current ISO time:', now.toISOString());

        const orders = await (sql as any).query(`
            SELECT id, order_no, total, receipt_issued_at, status
            FROM orders
            ORDER BY receipt_issued_at DESC
            LIMIT 10
        `);

        console.log('Last 10 orders:');
        console.table(orders);

        const today = await (sql as any).query(`
            SELECT COUNT(*) as count, SUM(total) as total
            FROM orders
            WHERE receipt_issued_at::date = CURRENT_DATE
        `);
        console.log('Orders for CURRENT_DATE (UTC):', today[0]);

        const serverNow = await (sql as any).query(`SELECT NOW() as now, CURRENT_DATE as today`);
        console.log('Server time info:', serverNow[0]);

    } catch (err) {
        console.error(err);
    }
}

checkData();

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set');
        return;
    }
    const sql = neon(process.env.DATABASE_URL);
    try {
        const serverInfo = await sql`SELECT NOW(), CURRENT_DATE`;
        console.log('Server time:', serverInfo[0]);

        const recent = await sql`SELECT id, total, status, receipt_issued_at FROM orders ORDER BY receipt_issued_at DESC LIMIT 5`;
        console.log('Recent orders:');
        console.table(recent);

        const countToday = await sql`SELECT COUNT(*) FROM orders WHERE receipt_issued_at::date = CURRENT_DATE`;
        console.log('Count for CURRENT_DATE (now):', countToday[0]);

    } catch (err) {
        console.error(err);
    }
}

check();

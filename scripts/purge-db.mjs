import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const sql = neon(url);

async function purge() {
    console.log('--- PURGING ALL DATA ---');
    try {
        await sql`TRUNCATE TABLE finance_transactions CASCADE`;
        await sql`TRUNCATE TABLE order_items CASCADE`;
        await sql`TRUNCATE TABLE orders CASCADE`;
        await sql`TRUNCATE TABLE cart_items CASCADE`;
        await sql`TRUNCATE TABLE products CASCADE`;
        await sql`TRUNCATE TABLE categories CASCADE`;
        await sql`TRUNCATE TABLE users CASCADE`;

        console.log('--- TABLES TRUNCATED ---');

        // Re-seed essential Admin user
        console.log('--- RE-SEEDING ADMIN ---');
        await sql`INSERT INTO users (username, role, salary, password_hash) VALUES ('admin', 'admin', 0, 'admin')`;

        // Re-seed 'All Items' category if used for logic
        await sql`INSERT INTO categories (id, name) VALUES (0, 'All Items') ON CONFLICT (id) DO NOTHING`;

        console.log('--- PURGE COMPLETE. DB IS CLEAN ---');
    } catch (e) {
        console.error('FAILED to purge DB:', e);
    }
}

purge().catch(console.error);

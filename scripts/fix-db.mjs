import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const sql = neon(url);

async function fix() {
    console.log('Checking database connection & schema...');
    try {
        const res = await sql`SELECT 1 as connected`;
        console.log('DB Connection:', res);

        console.log('Adding flavor column...');
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor TEXT`;
        console.log('Flavor column added (or already existed).');

        const schema = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'products'`;
        console.log('Current products columns:', schema.map(c => c.column_name).join(', '));

    } catch (e) {
        console.error('FAILED to fix DB:', e);
    }
}

fix().catch(console.error);

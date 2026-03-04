import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
    console.log('Adding flavor column to products table...');
    try {
        await (sql as any).query('ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor TEXT');
        console.log('Successfully added flavor column.');
    } catch (e) {
        console.error('Error adding flavor column:', e);
    }
}

migrate().catch(console.error);

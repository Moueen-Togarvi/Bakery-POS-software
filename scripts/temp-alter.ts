import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function main() {
    try {
        console.log('Adding UNIQUE constraint to products...');
        await (sql as any).query('ALTER TABLE products ADD CONSTRAINT products_name_unique UNIQUE (name)');
        console.log('Constraint added.');
    } catch (e) {
        console.error('Error (might already exist):', e);
    }
}
main();

import { returnOrder } from '../src/lib/server/pos';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function test() {
    try {
        console.log('Stock before return:');
        const before = await (sql as any).query("SELECT stock FROM products WHERE name = 'Fruit Cake'");
        console.table(before);

        await returnOrder(4);
        console.log('Return successful');

        console.log('Stock after return:');
        const after = await (sql as any).query("SELECT stock FROM products WHERE name = 'Fruit Cake'");
        console.table(after);

        console.log('Order status:');
        const order = await (sql as any).query('SELECT status FROM orders WHERE id = 4');
        console.table(order);
    } catch (e) {
        console.error('Test failed', e);
    }
}

test();

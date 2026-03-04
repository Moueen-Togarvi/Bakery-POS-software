import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
    console.log('Seeding database with step-by-step logging...');

    try {
        console.log('Step 1: Creating categories table...');
        await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
      )
    `);
        console.log('Categories table created.');

        console.log('Step 2: Creating products table...');
        await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          image_url TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
        console.log('Products table created.');

        console.log('Step 3: Creating orders table...');
        await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_no TEXT NOT NULL UNIQUE,
          customer_name TEXT,
          payment_method TEXT,
          receipt_no TEXT UNIQUE,
          receipt_issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          subtotal DECIMAL(10, 2) NOT NULL,
          tax DECIMAL(10, 2) NOT NULL,
          total DECIMAL(10, 2) NOT NULL
      )
    `);
        console.log('Orders table created.');

        console.log('Step 4: Creating order_items table...');
        await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id),
          name TEXT NOT NULL,
          image_url TEXT,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          line_total DECIMAL(10, 2) NOT NULL
      )
    `);
        console.log('Order items table created.');

        console.log('Step 4.5: Creating cart_items table...');
        await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          UNIQUE(product_id)
      )
    `);
        console.log('Cart items table created.');

        console.log('Step 5: Seeding categories...');
        const categories = ['Breads', 'Pastries', 'Cakes', 'Beverages', 'Sandwiches'];
        for (const name of categories) {
            process.stdout.write(`  Inserting category ${name}... `);
            await (sql as any).query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
            console.log('Done.');
        }

        console.log('Step 6: Getting category map...');
        const categoryRows = await (sql as any).query('SELECT id, name FROM categories');
        const categoryMap = Object.fromEntries(categoryRows.map((r: any) => [r.name, r.id]));
        console.log('Category map obtained.');

        console.log('Step 7: Seeding products...');
        const products = [
            {
                name: 'Butter Croissant',
                price: 280,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBp1CA5HsKZlq3ro8Sb1p0FfOskyCUsBsV1LGKaOb0NyKSK1VhsxRj7H9xR4EWsmuTyr0p5r9LHgzXkKwQKlgAIuKdBllS-IFG5EptYpWLHyt-6AxV3VuhLPKps8Q24qeVIygCjcAqwuMQIz71IkSyz5G5V-vN6lwc6Xx0esWB7vI905qonX5EsFBGUxako6MSg6pq3xl-wAvnCFWMdtCIUoN0jt1_jxDaxMj6xVC2jqniA7AwJ6obKfGmb_DWeLJuMrQ3_c2rIsyKH',
                category: 'Pastries'
            },
            {
                name: 'Sourdough Loaf',
                price: 500,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuUHGqh88Vnrt0Fz9Di91m99EZQN5Mh1pZ_A1uCIEFJDw1lP0LX6QDb1_FreKXXVrGZnw_Rh9Dthm92vhc79FFi_22UBc4yYo0yvaKnElNyAIUtHxFZ5QiVFKCwoI34hi1SfVQI72J2c2xvYRGjMG9Qi4b9E6jNIRsiTex3Miga1HQvcLpTOKdiYCSUvO9c0mX9Vil-AQoTUA6kbprX39grg1_pgFirpTAfsXbTlPndBQbq_W4b2lFW9nSS328drhyMwSi2THSsbhY',
                category: 'Breads'
            },
            {
                name: 'Chocolate Cake',
                price: 450,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqx6LTtqasWpNCcdh1avUsMr-v4tC9grpsu6a88rA-EhwougCh3jiFm4p9x8aukH233yw3DjSTrU0SUceMVxiv0JQUHii7qC2uiXfjE_UxUdyOGoEW6RQSqYDfS9pE440lRGHDcgvn_QyxlootOhTX9du_BWKAJeKamBFax6qhIMHSKdE8n4RPcQIdC_hMDAgWUcQeS8Fv0zw7Ou8sZYaDAoLidT4wa2uN4eNtSD8cLvdWKw5fHAB0YNrmStld5iZGldlz-2WDKTKJ',
                category: 'Cakes'
            },
            {
                name: 'Caffe Latte',
                price: 200,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-QHfl2pprwWqsx8p5TU4ckhlZEh6YMGhMxVQBTH6dfN0dpFnWAfn2SaFsbEE8n_eNrTl1YSMVT1iOpVnVrlIB6sJu2gmwI4BUIGcmCoGxowEbBIXKxCUCPaO0Gb3hGpObw37aUHeLfpdn72Q3RdMbWI6Okn3yfOx0ycw-nXMd3NtLIih8hQ54I2yuNMbtH8DUTUku2kZikKRv7huAqs3CKh-kZ6uOVsh3DGpYKVMIexXHB_OTo-m2meNg7R3HZa5-Pj4A9wr9xNbv',
                category: 'Beverages'
            }
        ];

        for (const p of products) {
            process.stdout.write(`  Inserting product ${p.name}... `);
            await (sql as any).query(`
                INSERT INTO products (name, price, image_url, category_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (name) DO UPDATE SET
                    price = EXCLUDED.price,
                    image_url = EXCLUDED.image_url,
                    category_id = EXCLUDED.category_id
            `, [p.name, p.price, p.imageUrl, categoryMap[p.category]]);
            console.log('Done.');
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seed();

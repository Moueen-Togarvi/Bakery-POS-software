import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function reseed() {
  console.log('--- RE-SEEDING DATABASE FOR SATLUJ SOLAR ---');

  try {
    // 1. Truncate all tables
    console.log('Cleaning existing data...');
    await (sql as any).query('TRUNCATE TABLE finance_transactions, order_items, orders, cart_items, products, categories, users, settings CASCADE');
    console.log('Tables cleaned.');

    // 2. Set up Schema (just in case)
    await (sql as any).query(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
    await (sql as any).query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        salary DECIMAL(10, 2) DEFAULT 0,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        buying_price DECIMAL(10, 2) DEFAULT 0,
        image_url TEXT,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        stock INTEGER NOT NULL DEFAULT 0,
        sku TEXT,
        unit_type TEXT DEFAULT 'pcs',
        flavor TEXT
      )
    `);

    // 3. Seed Settings
    console.log('Seeding settings...');
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('store_name', 'Satluj Solar')");
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('logo_url', '/logo.png')");
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('tax_rate', '0')");
    console.log('Settings seeded.');

    // 4. Seed Users
    console.log('Seeding users...');
    await (sql as any).query("INSERT INTO users (username, password_hash, role, salary) VALUES ('admin', 'password123', 'admin', 0)");
    console.log('Users seeded.');

    // 5. Seed Categories
    console.log('Seeding categories...');
    const categories = ['Solar Panels', 'Inverters', 'Batteries', 'Accessories'];
    const categoryIds: any = {};
    for (const name of categories) {
      const res = await (sql as any).query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
      categoryIds[name] = res[0].id;
    }
    console.log('Categories seeded.');

    // 6. Seed Products
    console.log('Seeding products...');
    const products = [
      {
        name: 'Jinko Solar Panel 550W',
        price: 35000,
        buying_price: 32000,
        category_id: categoryIds['Solar Panels'],
        stock: 50,
        sku: 'SLP-JIN-550',
        unit_type: 'pcs',
        flavor: 'Mono-Perc'
      },
      {
        name: 'Longi Solar Panel 540W',
        price: 34000,
        buying_price: 31000,
        category_id: categoryIds['Solar Panels'],
        stock: 40,
        sku: 'SLP-LON-540',
        unit_type: 'pcs',
        flavor: 'High-Efficiency'
      },
      {
        name: 'Huawei Inverter 10kW',
        price: 250000,
        buying_price: 230000,
        category_id: categoryIds['Inverters'],
        stock: 10,
        sku: 'INV-HUA-10K',
        unit_type: 'pcs',
        flavor: 'Three-Phase'
      },
      {
        name: 'Lithium Battery 48V 100Ah',
        price: 180000,
        buying_price: 165000,
        category_id: categoryIds['Batteries'],
        stock: 25,
        sku: 'BAT-LIT-100',
        unit_type: 'pcs',
        flavor: 'Deep-Cycle'
      },
      {
        name: 'Solar DC Cable 6mm',
        price: 250,
        buying_price: 200,
        category_id: categoryIds['Accessories'],
        stock: 500,
        sku: 'ACC-CBL-6MM',
        unit_type: 'liter', // generic unit type used in POS for length sometimes
        flavor: 'Red/Black'
      }
    ];

    for (const p of products) {
      await (sql as any).query(`
        INSERT INTO products (name, price, buying_price, category_id, stock, sku, unit_type, flavor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [p.name, p.price, p.buying_price, p.category_id, p.stock, p.sku, p.unit_type, p.flavor]);
    }
    console.log('Products seeded.');

    console.log('--- RESEED COMPLETE. DATABASE IS CLEAN AND READY ---');
  } catch (e) {
    console.error('FAILED to reseed DB:', e);
    process.exit(1);
  }
}

reseed().catch(console.error);

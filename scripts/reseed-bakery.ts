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
  console.log('--- RE-SEEDING DATABASE FOR BAKERY POS ---');

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
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('store_name', 'hot&Cold')");
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('logo_url', '/logo-bakery.svg')");
    await (sql as any).query("INSERT INTO settings (key, value) VALUES ('tax_rate', '0')");
    console.log('Settings seeded.');

    // 4. Seed Users
    console.log('Seeding users...');
    await (sql as any).query("INSERT INTO users (username, password_hash, role, salary) VALUES ('admin', 'password123', 'admin', 0)");
    console.log('Users seeded.');

    // 5. Seed Categories
    console.log('Seeding categories...');
    const categories = ['Breads', 'Pastries', 'Cakes', 'Cookies', 'Beverages'];
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
        name: 'Sourdough Loaf',
        price: 500,
        buying_price: 220,
        category_id: categoryIds['Breads'],
        stock: 24,
        sku: 'BRD-SRD-001',
        unit_type: 'pcs',
        flavor: 'Classic'
      },
      {
        name: 'Butter Croissant',
        price: 280,
        buying_price: 95,
        category_id: categoryIds['Pastries'],
        stock: 40,
        sku: 'PST-CRS-002',
        unit_type: 'pcs',
        flavor: 'Buttery'
      },
      {
        name: 'Cinnamon Roll',
        price: 320,
        buying_price: 120,
        category_id: categoryIds['Pastries'],
        stock: 30,
        sku: 'PST-CRL-003',
        unit_type: 'pcs',
        flavor: 'Cinnamon'
      },
      {
        name: 'Chocolate Cake Slice',
        price: 450,
        buying_price: 180,
        category_id: categoryIds['Cakes'],
        stock: 20,
        sku: 'CAK-CHO-004',
        unit_type: 'slice',
        flavor: 'Chocolate'
      },
      {
        name: 'Red Velvet Cupcake',
        price: 260,
        buying_price: 95,
        category_id: categoryIds['Cakes'],
        stock: 28,
        sku: 'CAK-RVC-005',
        unit_type: 'pcs',
        flavor: 'Red Velvet'
      },
      {
        name: 'Chocolate Chip Cookie',
        price: 150,
        buying_price: 45,
        category_id: categoryIds['Cookies'],
        stock: 60,
        sku: 'CKI-CCK-006',
        unit_type: 'pcs',
        flavor: 'Chocolate Chip'
      },
      {
        name: 'Oatmeal Cookie',
        price: 140,
        buying_price: 40,
        category_id: categoryIds['Cookies'],
        stock: 55,
        sku: 'CKI-OAT-007',
        unit_type: 'pcs',
        flavor: 'Oatmeal'
      },
      {
        name: 'Caffe Latte',
        price: 200,
        buying_price: 75,
        category_id: categoryIds['Beverages'],
        stock: 35,
        sku: 'BEV-LAT-008',
        unit_type: 'cup',
        flavor: 'Milk Coffee'
      },
      {
        name: 'Fresh Orange Juice',
        price: 220,
        buying_price: 90,
        category_id: categoryIds['Beverages'],
        stock: 25,
        sku: 'BEV-JUI-009',
        unit_type: 'glass',
        flavor: 'Orange'
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

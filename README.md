# Satluj Solar POS Software

A fully database-backed Point of Sale system built with **SvelteKit** + **Neon PostgreSQL**.

## Stack

- **Frontend**: SvelteKit + Tailwind CSS
- **Backend**: SvelteKit Server Routes (TypeScript)
- **Database**: [Neon](https://neon.tech) Serverless PostgreSQL (`@neondatabase/serverless`)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and set your Neon connection string:
```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
```

### 3. Seed the database (first time only)
```bash
npx tsx scripts/seed.ts
```
This will create all tables and seed categories + sample products.

### 4. Run locally
```bash
npm run dev
```

## Database Schema

| Table | Purpose |
|---|---|
| `categories` | Product categories |
| `products` | Solar products with price and image |
| `cart_items` | Active cart (persistent across requests) |
| `orders` | Completed sale records |
| `order_items` | Line items per completed order |

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/products?categoryId=<id>` | List products (filtered by category) |
| GET | `/api/cart` | Get active cart |
| POST | `/api/cart` | Add/remove item `{ productId, delta }` |
| PATCH | `/api/cart` | Set payment method `{ paymentMethod }` |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/cart/complete` | Complete sale `{ paymentMethod }` |
| GET | `/api/cart/receipt` | Get latest receipt |
| GET | `/api/inventory` | Inventory table |
| GET | `/api/inventory/categories` | All categories |
| POST | `/api/inventory/categories` | Add category |
| POST | `/api/inventory/products` | Add product |

## Utility Scripts

```bash
# Verify DB data
npx tsx scripts/check-db.ts

# Re-seed products/categories
npx tsx scripts/seed.ts
```

## Deploy

```bash
npm run vercel:deploy
```

Requires `.env` variables set in Vercel dashboard: `DATABASE_URL`.

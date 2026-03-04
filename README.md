# Bakery POS Software (SvelteKit + Neon PostgreSQL)

Sample frontend ko existing `bakery_pos_sales_checkout/code.html` style ke basis par SvelteKit mein convert kiya gaya hai. Data (categories, products, cart) Neon PostgreSQL se aa raha hai.

## Stack
- SvelteKit
- Tailwind CSS
- Neon PostgreSQL (via `postgres` driver)

## Setup
1. Dependencies install karo:
   ```bash
   npm install
   ```
2. `.env.example` ko copy karke `.env` banao aur Neon `DATABASE_URL` set karo.
3. DB schema + sample data seed karo:
   ```bash
   npm run db:seed
   ```
4. Dev server run karo:
   ```bash
   npm run dev
   ```

## Included DB schema
- `categories`
- `products`
- `sales_orders`
- `sales_order_items`

Schema file: `db/schema.sql`

## API endpoints
- `GET /api/products?categoryId=<id>`
- `GET /api/cart`
- `POST /api/cart` with `{ "productId": number, "delta": number }`
- `DELETE /api/cart`

## Existing source references used
- `bakery_pos_sales_checkout/code.html`
- `bakery_inventory_records/screen.png`
- `bakery_purchase_history/screen.png`
- `bakery_pos_sales_checkout/screen.png`

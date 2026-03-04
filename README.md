# Bakery POS Software (SvelteKit Serverless Demo)

Yeh project ab pure **serverless fake-data mode** mein hai.
Koi PostgreSQL/Neon dependency nahi hai.

## Stack
- SvelteKit
- Tailwind CSS
- In-memory fake backend store (server routes)

## Run
```bash
npm install
npm run dev
```

## Important
- Data in-memory hai, restart par reset ho jata hai.
- Inventory add/category add, cart updates, payment method, complete sale, receipt print sab fake backend par chal rahe hain.

## API endpoints
- `GET /api/products?categoryId=<id>`
- `GET /api/cart`
- `POST /api/cart` with `{ "productId": number, "delta": number }`
- `PATCH /api/cart` with `{ "paymentMethod": "Cash" | "Card" | "QR" }`
- `DELETE /api/cart`
- `POST /api/cart/complete`
- `GET /api/cart/receipt`
- `GET /api/inventory`
- `GET /api/inventory/categories`
- `POST /api/inventory/categories`
- `POST /api/inventory/products`

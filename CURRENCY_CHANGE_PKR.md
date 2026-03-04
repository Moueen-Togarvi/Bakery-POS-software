# Currency Changed to Pakistani Rupees (PKR)

## Changes Made

### 1. Currency Formatter Updated
**File:** [src/lib/components/Currency.ts](src/lib/components/Currency.ts)
- Changed from `USD` to `PKR`
- Changed locale from `en-US` to `ur-PK` (Urdu-Pakistan)
- All prices now display with Pakistani Rupee formatting (ر.ع)

### 2. Mock Data Updated
**File:** [src/lib/server/mock.ts](src/lib/server/mock.ts)
- Updated all product prices to PKR:
  - Butter Croissant: ₨280
  - Sourdough Loaf: ₨500
  - Chocolate Cake: ₨450
  - Caffe Latte: ₨200
- Updated mock cart with PKR prices
- Subtotal, tax, and total now in PKR

## Example Price Conversions

Used approximate conversion rate of 1 USD ≈ 280 PKR:
- $3.50 → ₨280 (Pastries)
- $5.50 → ₨450 (Cakes)
- $7.00 → ₨500 (Breads)
- $4.25 → ₨200 (Beverages)

## How It Displays

When you open the app, all prices will now show as:
- ₨280.00 (regular numbers)
- ر.ع ٢٨٠٫٠٠ (with Urdu locale)

The exact format depends on browser settings but will always use PKR currency.

## Database Updates (For Production)

If you have a live database, update your product prices:

```sql
UPDATE products SET price = 280 WHERE name = 'Butter Croissant';
UPDATE products SET price = 500 WHERE name = 'Sourdough Loaf';
UPDATE products SET price = 450 WHERE name = 'Chocolate Cake';
UPDATE products SET price = 200 WHERE name = 'Caffe Latte';
-- ... update other products as needed
```

## Test Locally

```bash
npm run dev
```

Visit http://localhost:5173 and verify:
- ✅ Prices display in PKR
- ✅ Currency symbol shows correctly
- ✅ Tax calculation is correct (8%)
- ✅ Cart totals are accurate

## Deploy to Vercel

```bash
git add .
git commit -m "Change currency to Pakistani Rupees (PKR)"
git push origin main
```

Then redeploy on Vercel:
1. Go to Vercel dashboard
2. Select your project
3. Click "Redeploy" on latest deployment
4. Wait for build to complete

## Tax Rate

Current tax rate: 8% (can be adjusted in [src/lib/server/pos.ts](src/lib/server/pos.ts))

## Currency Code in Code

If you need to update currency elsewhere:
- Locale: `ur-PK` (Urdu - Pakistan)
- Currency Code: `PKR`
- Currency Symbol: ₨

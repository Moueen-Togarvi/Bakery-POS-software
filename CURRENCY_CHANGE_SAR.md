# Currency Changed to Saudi Riyal (SAR)

## Changes Made

### 1. Currency Formatter Updated
**File:** [src/lib/components/Currency.ts](src/lib/components/Currency.ts)
- Changed currency to `SAR`
- Changed locale to `en-SA`
- All prices now display with Saudi Riyal formatting

### 2. Mock Data Updated
**File:** [src/lib/server/mock.ts](src/lib/server/mock.ts)
- Existing product prices remain unchanged numerically
- Prices now render as Saudi Riyal throughout the UI
- Subtotal, tax, and total now display in SAR

## Display Examples

- `SAR 280.00`
- `SAR 500.00`
- `SAR 450.00`
- `SAR 200.00`

## How It Displays

When you open the app, all prices will now show as:
- `SAR 280.00` or browser-native Saudi Riyal formatting
- Consistent SAR output across product prices, totals, and reports

The exact format depends on browser support, but it will always use SAR currency.

## Database Updates (For Production)

No database migration is required if you only want to change displayed currency.

If you also want to convert stored price values to Saudi Riyal amounts, update product prices separately based on your preferred exchange rate.

Example:

```sql
UPDATE products SET price = 280 WHERE name = 'Butter Croissant';
UPDATE products SET price = 500 WHERE name = 'Sourdough Loaf';
UPDATE products SET price = 450 WHERE name = 'Chocolate Cake Slice';
UPDATE products SET price = 200 WHERE name = 'Caffe Latte';
```

## Test Locally

```bash
npm run dev
```

Visit http://localhost:5173 and verify:
- ✅ Prices display in SAR
- ✅ Currency symbol shows correctly
- ✅ Tax calculation is correct (8%)
- ✅ Cart totals are accurate

## Deploy to Vercel

```bash
git add .
git commit -m "Change currency to Saudi Riyal (SAR)"
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
- Locale: `en-SA` (English - Saudi Arabia)
- Currency Code: `SAR`
- Currency Symbol: `SAR` or browser-native Saudi Riyal symbol

# Vercel 500 Error - Serverless Function Crash Fix

## What Was Wrong

Your serverless function was crashing due to database connection issues in the Vercel environment. In serverless functions, connections work differently than traditional servers.

## What I Fixed

### 1. Database Connection Configuration (`src/lib/server/db.ts`)
Added proper serverless connection parameters:
- `idle_timeout: 30` - Close idle connections after 30 seconds
- `connect_timeout: 10` - Timeout after 10 seconds if connection fails
- `max_lifetime: 60 * 30` - Connection lifetime max 30 minutes
- `max_idle_lifetime: 30` - Idle connection lifetime 30 seconds
- Better error handling and logging

This prevents connection pool exhaustion and hanging connections.

## Steps to Deploy the Fix

### 1. Commit and Push Changes
```bash
cd /home/moueen-togarvi/code/Bakery-POS-software
git add .
git commit -m "Fix Vercel serverless database connection timeout"
git push origin main
```

### 2. Redeploy on Vercel
1. Go to https://vercel.com/dashboard
2. Select your Bakery POS project
3. Go to "Deployments" tab
4. Click the latest deployment
5. Scroll down and click "Redeploy" button
6. Wait for build to complete

### 3. Verify Database Environment Variable
Before redeploying, double-check:
1. Settings → Environment Variables
2. Confirm `DATABASE_URL` is set (without secret references)
3. The value should be your full Neon connection string

## If You Still Get 500 Error

### Check These Things:

**1. Database Connection String**
- Make sure DATABASE_URL doesn't have typos
- Verify it's a valid Neon connection string
- Should look like: `postgresql://user:pass@host/db?sslmode=require&channel_binding=require`

**2. Check Vercel Logs**
1. Go to your Vercel project
2. Click "Deployments" tab
3. Click the latest failed deployment
4. Click "Logs" to see error details
5. Look for database connection errors

**3. Test Database Locally First**
```bash
npm run db:seed
```
If this works locally with the same DATABASE_URL, then the issue is Vercel-specific.

**4. Clear Vercel Cache**
1. Project Settings → Deployment
2. Uncheck "Enable Preview Deployment"
3. Then re-enable it
4. Trigger a new deployment

## Fallback Mode

Your app has automatic fallback functionality:
- If database is unavailable, it serves mock data
- Basic UI will work with sample products
- Actual database operations will fail but the page loads
- Check browser console for logged messages

## Connection Pool Management

The postgres client now properly:
- Closes idle connections automatically
- Times out hanging connections
- Handles connection errors gracefully
- Logs connection issues for debugging

## What to Monitor

After deployment, check:
1. ✅ Pages load without 500 error
2. ✅ Products display correctly
3. ✅ Cart functionality works
4. ✅ No console errors in browser dev tools

## Still Having Issues?

1. Check Vercel Function Logs:
   - Project → Deployments → Click deployment → View Logs
   
2. Common Messages:
   - "DATABASE_URL is missing" → Environment variable not set
   - "Connection timeout" → Network/firewall issue with Neon
   - "FUNCTION_INVOCATION_FAILED" → Check logs for details

3. Contact Neon Support if:
   - Your database is suspended
   - Connection limits exceeded
   - Database is in trial mode

## Local Development

To test locally:
```bash
npm run dev
```

The app will:
- Try to connect to DATABASE_URL in .env
- Fall back to mock data if connection fails
- Show helpful error messages in console

This ensures you can test UI without database issues.

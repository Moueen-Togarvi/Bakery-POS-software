# Fix for Vercel Deployment Error

## Error Message
```
Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist.
```

## Solution

The error occurs because the configuration was trying to reference a non-existent secret. Here's how to fix it:

### Step 1: Go to Vercel Project Settings
1. Log in to https://vercel.com
2. Select your Bakery POS project
3. Click "Settings" tab

### Step 2: Add Environment Variable
1. Go to "Environment Variables" section
2. Click "Add New Variable"
3. Fill in the fields:
   - **Name:** `DATABASE_URL`
   - **Value:** Paste your full Neon PostgreSQL connection string
     - Example: `postgresql://neondb_owner:npg_xxxxx@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - **Environments:** Select all (Development, Preview, Production)

### Step 3: Redeploy
1. Go to "Deployments" tab
2. Find the failed deployment
3. Click the three dots menu (⋮) and select "Redeploy"
4. Wait for the deployment to complete

## How to Get Your Neon Connection String

If you don't have a Neon connection string yet:

1. Visit https://neon.tech
2. Sign up for a free account
3. Create a new project
4. Click on your project to open the dashboard
5. In the Connection string section, copy the full connection string
6. The string looks like: `postgresql://user:password@endpoint/dbname?sslmode=require&channel_binding=require`

## Verify Your .env File (Local Development)

Make sure your local `.env` file also has the correct DATABASE_URL:
```bash
DATABASE_URL='postgresql://neondb_owner:npg_xxxxx@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

## Common Issues

### Still Getting the Error?
- Clear Vercel cache: Settings → Deployments → Delete all deployments, then redeploy
- Make sure you copied the entire connection string (including protocol, user, password, host, and parameters)
- Verify there are no extra spaces at the beginning or end

### Database Connection Timing Out?
- Check that your Neon project is active and not in trial mode
- Make sure your Neon credentials are correct
- Test locally first with `npm run db:seed` to verify connection works

## After Successful Deployment

Once deployed successfully:
1. Visit your Vercel app URL
2. The database tables will be created automatically if they don't exist
3. Run `npm run db:seed` locally to seed sample data (optional)

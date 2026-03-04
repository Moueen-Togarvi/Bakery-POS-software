# Deployment Guide - Vercel

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with your code pushed
- Neon PostgreSQL database (https://neon.tech)

## Steps to Deploy

### 1. Set Up Database
If you haven't already, create a free Neon PostgreSQL database:
- Visit https://neon.tech and sign up
- Create a new database project
- Copy your connection string (DATABASE_URL)

### 2. Connect to Vercel
1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Vercel will auto-detect this is a SvelteKit project

### 3. Configure Environment Variables
In the Vercel project settings:
1. Go to "Settings" → "Environment Variables"
2. Click "Add New"
3. Enter the following:
   - **Name:** `DATABASE_URL`
   - **Value:** Your Neon connection string (paste your full connection string here)
   - **Environments:** Select all (Development, Preview, Production)
   - Make sure you're **NOT** using any secret references like `@database_url`
4. Click "Save"
5. Go back to Deployments and trigger a redeploy

### 4. Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

### 5. Initialize Database (First Time Only)
After deployment, you need to seed the database:
1. In your local terminal, run:
   ```bash
   npm run db:seed
   ```
   Make sure your `.env` file has the correct DATABASE_URL pointing to your Neon database.

2. This will create all tables and seed sample data.

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string from Neon (required)

## Build Information
- **Build Command:** `npm run build`
- **Output Directory:** `.svelte-kit`
- **Node Version:** 18.x or higher (Vercel default)

## Notes
- The app uses `@sveltejs/adapter-vercel` for optimal Vercel integration
- All database operations go through Neon's serverless PostgreSQL
- Server code is automatically converted to Vercel Functions
- Static assets are optimized and served via Vercel's CDN

## Troubleshooting
If deployment fails:
1. Check that NODE_VERSION is compatible (18+)
2. Verify DATABASE_URL environment variable is set correctly
3. Check Vercel build logs for specific errors
4. Ensure all npm dependencies are in package.json

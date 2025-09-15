# Vercel Deployment Guide

## Changes Made for Vercel Deployment

### 1. MongoDB Connection Fix
- **File**: `lib/mongodb.js`
- **Change**: Updated global mongoose caching to work with Vercel's serverless environment
- **Why**: Vercel's serverless functions don't maintain global state between requests

### 2. Next.js Configuration
- **File**: `next.config.ts`
- **Changes**:
  - Added `serverComponentsExternalPackages: ['mongoose']` for proper MongoDB handling
  - Added webpack configuration to handle MongoDB client encryption
- **Why**: Ensures MongoDB works properly in Vercel's build environment

### 3. TypeScript Configuration
- **File**: `tsconfig.json`
- **Changes**:
  - Added `forceConsistentCasingInFileNames: true`
  - Included `**/*.js` and `**/*.jsx` files in compilation
- **Why**: Better compatibility with mixed JS/TS codebases

### 4. Package.json Scripts
- **File**: `package.json`
- **Changes**:
  - Updated lint script to use `next lint`
  - Added `type-check` script
- **Why**: Better integration with Next.js tooling

### 5. Environment Variables
- **File**: `.env.example`
- **Created**: Template for required environment variables
- **Required Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MONGODB_URI`

### 6. Vercel Configuration
- **File**: `vercel.json`
- **Created**: Vercel-specific configuration
- **Features**:
  - Extended function timeout to 30 seconds
  - Environment variable mapping

## Deployment Steps

### 1. Set up Environment Variables in Vercel
Go to your Vercel project dashboard and add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MONGODB_URI=your_mongodb_connection_string
```

### 2. MongoDB Atlas Setup
1. Create a MongoDB Atlas cluster
2. Whitelist Vercel's IP ranges (or use 0.0.0.0/0 for development)
3. Create a database user with read/write permissions
4. Get your connection string and add it to Vercel environment variables

### 3. Supabase Setup
1. Create a Supabase project
2. Get your project URL and anon key from Settings > API
3. Get your service role key from Settings > API (keep this secret!)
4. Add all keys to Vercel environment variables

### 4. Deploy
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will automatically detect it's a Next.js project
4. Add your environment variables in the Vercel dashboard
5. Deploy!

## Important Notes

- **MongoDB**: Make sure your MongoDB Atlas cluster allows connections from Vercel's IP ranges
- **Supabase**: Ensure your Supabase project has the correct CORS settings for your domain
- **Environment Variables**: Never commit `.env.local` to version control
- **Database Seeding**: You may need to run the seed script after deployment to populate your database

## Troubleshooting

### Common Issues:
1. **MongoDB Connection Timeout**: Check your MongoDB Atlas network access settings
2. **Supabase Auth Issues**: Verify your environment variables are correctly set
3. **Build Failures**: Check the Vercel build logs for specific error messages
4. **Function Timeouts**: The vercel.json file sets a 30-second timeout for API routes

### Testing Locally:
```bash
npm run dev
```

### Building for Production:
```bash
npm run build
npm run start
```
